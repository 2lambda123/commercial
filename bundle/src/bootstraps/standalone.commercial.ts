/*
 * This standalone bundle is so called because it “stands alone”,
 * meaning it is not part of another webpack build process, and
 * can be imported as a JS <script>.
 *
 * See PR https://github.com/guardian/frontend/pull/24058
 *
 * The standalone commercial bundle is bundled from source files
 * here in Frontend, but is served from https://assets.guim.co.uk
 * in production DCR and Frontend.
 *
 * Changes here will be served on DCR & Frontend rendered pages.
 */

import { EventTimer } from '@guardian/commercial-core';
import {
	getConsentFor,
	onConsent,
} from '@guardian/consent-management-platform';
import { log } from '@guardian/libs';
import { initTeadsCookieless } from 'commercial/modules/teads-cookieless';
import { isInVariantSynchronous } from 'common/modules/experiments/ab';
import { consentlessAds } from 'common/modules/experiments/tests/consentlessAds';
import { elementsManager } from 'common/modules/experiments/tests/elements-manager';
import { reportError } from '../lib/report-error';
import { catchErrorsWithContext } from '../lib/robust';
import { adFreeSlotRemove } from '../projects/commercial/modules/ad-free-slot-remove';
import { init as initComscore } from '../projects/commercial/modules/comscore';
import { adSlotIdPrefix } from '../projects/commercial/modules/dfp/dfp-env-globals';
import { init as initIpsosMori } from '../projects/commercial/modules/ipsos-mori';
import { manageAdFreeCookieOnConsentChange } from '../projects/commercial/modules/manage-ad-free-cookie-on-consent-change';
import { removeDisabledSlots as closeDisabledSlots } from '../projects/commercial/modules/remove-slots';
import { init as initTrackGpcSignal } from '../projects/commercial/modules/track-gpc-signal';
import { init as initTrackLabsContainer } from '../projects/commercial/modules/track-labs-container';
import { init as initTrackScrollDepth } from '../projects/commercial/modules/track-scroll-depth';
import { commercialFeatures } from '../projects/common/modules/commercial/commercial-features';
import type { Modules } from './types';

const { isDotcomRendering, frontendAssetsFullURL, page } =
	window.guardian.config;

const decideAssetsPath = () => {
	if (process.env.OVERRIDE_BUNDLE_PATH) {
		return process.env.OVERRIDE_BUNDLE_PATH;
	} else {
		const assetsPath = frontendAssetsFullURL ?? page.assetsPath;
		return `${assetsPath}javascripts/commercial/`;
	}
};

__webpack_public_path__ = decideAssetsPath();

const tags: Record<string, string> = {
	feature: 'commercial',
	bundle: 'standalone',
};

// modules necessary to load the first ads on the page
const commercialBaseModules: Modules = [];

// remaining modules not necessary to load an ad
const commercialExtraModules: Modules = [
	['cm-adFreeSlotRemoveFronts', adFreeSlotRemove],
	['cm-manageAdFreeCookieOnConsentChange', manageAdFreeCookieOnConsentChange],
	['cm-closeDisabledSlots', closeDisabledSlots],
	['cm-comscore', initComscore],
	['cm-ipsosmori', initIpsosMori],
	['cm-teadsCookieless', initTeadsCookieless],
	['cm-trackScrollDepth', initTrackScrollDepth],
	['cm-trackLabsContainer', initTrackLabsContainer],
	['cm-trackGpcSignal', initTrackGpcSignal],
];

/**
 * TODO
 */
const loadGamModules = async (): Promise<void> => {
	if (!commercialFeatures.adFree) {
		const { baseModules, extraModules } = await import(
			/* webpackChunkName: "gam" */
			'./gam.commercial'
		);
		commercialBaseModules.push(...baseModules);
		commercialExtraModules.push(...extraModules);
	}
};

/**
 * Load modules specific to `dotcom-rendering`.
 * Not sure if this is needed. Currently no separate chunk is created
 * Introduced by @tomrf1
 */
const loadDcrBundle = async (): Promise<void> => {
	if (!isDotcomRendering) return;

	const userFeatures = await import(
		/* webpackChunkName: "dcr" */
		'common/modules/commercial/user-features'
	);

	commercialExtraModules.push(['c-user-features', userFeatures.refresh]);
	return;
};

const loadModules = (modules: Modules, eventName: string) => {
	const modulePromises: Array<Promise<unknown>> = [];

	modules.forEach((module) => {
		const [moduleName, moduleInit] = module;

		catchErrorsWithContext(
			[
				[
					moduleName,
					function pushAfterComplete(): void {
						const result = moduleInit();
						modulePromises.push(result);
					},
				],
			],
			tags,
		);
	});

	return Promise.allSettled(modulePromises).then(() => {
		EventTimer.get().trigger(eventName);
	});
};

const recordCommercialMetrics = () => {
	const eventTimer = EventTimer.get();
	eventTimer.trigger('commercialModulesLoaded');
	// record the number of ad slots on the page
	const adSlotsTotal = document.querySelectorAll(
		`[id^="${adSlotIdPrefix}"]`,
	).length;
	eventTimer.setProperty('adSlotsTotal', adSlotsTotal);

	// and the number of inline ad slots
	const adSlotsInline = document.querySelectorAll(
		`[id^="${adSlotIdPrefix}inline"]`,
	).length;
	eventTimer.setProperty('adSlotsInline', adSlotsInline);
};

const bootCommercial = async (): Promise<void> => {
	log('commercial', '📦 standalone.commercial.ts', __webpack_public_path__);

	// Init Commercial event timers
	EventTimer.init();

	catchErrorsWithContext(
		[
			[
				'ga-user-timing-commercial-start',
				function runTrackPerformance() {
					EventTimer.get().trigger('commercialStart');
				},
			],
		],
		tags,
	);

	// Stub the command queue
	// @ts-expect-error -- it’s a stub, not the whole Googletag object
	window.googletag = {
		cmd: [],
	};

	try {
		await loadDcrBundle();

		await loadGamModules();

		const allModules: Array<Parameters<typeof loadModules>> = [
			[commercialBaseModules, 'commercialBaseModulesLoaded'],
			[commercialExtraModules, 'commercialExtraModulesLoaded'],
		];
		const promises = allModules.map((args) => loadModules(...args));

		await Promise.all(promises).then(recordCommercialMetrics);
	} catch (error) {
		// report async errors in bootCommercial to Sentry with the commercial feature tag
		reportError(error, tags, false);
	}
};

/**
 * Choose whether to launch Googletag or Opt Out tag (ootag) based on consent state
 */
const chooseAdvertisingTag = async () => {
	const consentState = await onConsent();
	// Only load the Opt Out tag in TCF regions when there is no consent for Googletag
	if (consentState.tcfv2 && !getConsentFor('googletag', consentState)) {
		// Don't load OptOut (for now) if loading Elements Manager
		if (isInVariantSynchronous(elementsManager, 'variant')) {
			return;
		}

		void import(
			/* webpackChunkName: "consentless" */
			'./commercial.consentless'
		).then(({ bootConsentless }) => bootConsentless(consentState));
	} else {
		if (window.guardian.mustardCut || window.guardian.polyfilled) {
			void bootCommercial();
		} else {
			window.guardian.queue.push(bootCommercial);
		}
	}
};

if (isInVariantSynchronous(elementsManager, 'variant')) {
	void import(
		/* webpackChunkName: "elements-manager" */
		'../projects/commercial/modules/elements-manager/init'
	).then(({ initElementsManager }) => initElementsManager());
}

/* Provide consentless advertising in the variant of a zero-percent test,
   regardless of consent state. This is currently just for testing purposes.

   If not in the variant, get the usual commercial experience
*/
if (isInVariantSynchronous(consentlessAds, 'variant')) {
	void chooseAdvertisingTag();
} else {
	if (window.guardian.mustardCut || window.guardian.polyfilled) {
		void bootCommercial();
	} else {
		window.guardian.queue.push(bootCommercial);
	}
}
