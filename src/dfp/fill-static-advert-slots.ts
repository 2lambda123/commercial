import { isNonNullable, log } from '@guardian/libs';
import type { SizeMapping } from 'core/ad-sizes';
import { adSizes, createAdSize } from 'core/ad-sizes';
import { getCurrentBreakpoint } from 'detect/detect-breakpoint';
import { commercialFeatures } from 'lib/commercial-features';
import { removeDisabledSlots } from '../lib/remove-slots';
import { createAdvert } from './create-advert';
import { dfpEnv } from './dfp-env';
import { displayAds } from './display-ads';
import { displayLazyAds } from './display-lazy-ads';
import { setupPrebidOnce } from './prepare-prebid';
import { queueAdvert } from './queue-advert';

const decideAdditionalSizes = (adSlot: HTMLElement): SizeMapping => {
	const { contentType } = window.guardian.config.page;
	const { name } = adSlot.dataset;

	if (contentType === 'Gallery' && name?.includes('inline')) {
		return {
			desktop: [adSizes.billboard, createAdSize(900, 250)],
		};
	}

	if (contentType === 'LiveBlog' && name?.includes('inline')) {
		return {
			phablet: [adSizes.outstreamDesktop, adSizes.outstreamGoogleDesktop],
			desktop: [adSizes.outstreamDesktop, adSizes.outstreamGoogleDesktop],
		};
	}

	return {};
};

/**
 * Static ad slots that were rendered on the page by the server are collected here.
 *
 * For dynamic ad slots that are created at js-runtime, see:
 *  - article-aside-adverts
 *  - article-body-adverts
 *  - liveblog-adverts
 *  - high-merch
 */
const fillStaticAdvertSlots = async (): Promise<void> => {
	// This module has the following strict dependencies. These dependencies must be
	// fulfilled before this function can execute reliably. The bootstrap
	// initiates these dependencies, to speed up the init process. Bootstrap also captures the module performance.
	const dependencies: Array<Promise<void>> = [removeDisabledSlots()];

	await Promise.all(dependencies);

	// Prebid might not load if it does not have consent
	// TODO: use Promise.allSettled, once we have Node 12
	await setupPrebidOnce().catch((reason) =>
		log('commercial', 'could not load Prebid.js', reason),
	);

	// Quit if ad-free
	if (commercialFeatures.adFree) {
		return Promise.resolve();
	}

	const isDCRMobile =
		window.guardian.config.isDotcomRendering &&
		getCurrentBreakpoint() === 'mobile';

	// Get all ad slots
	const adverts = [
		...document.querySelectorAll<HTMLElement>(dfpEnv.adSlotSelector),
	]
		.filter((adSlot) => !dfpEnv.adverts.has(adSlot.id))
		// TODO: find cleaner workaround
		// we need to not init top-above-nav on mobile view in DCR
		// as the DOM element needs to be removed and replaced to be inline
		// refer to: 3562dc07-78e9-4507-b922-78b979d4c5cb
		.filter(
			(adSlot) => !(isDCRMobile && adSlot.id === 'dfp-ad--top-above-nav'),
		)
		.map((adSlot) => {
			const additionalSizes = decideAdditionalSizes(adSlot);
			return createAdvert(adSlot, additionalSizes);
		})
		.filter(isNonNullable);

	for (const advert of adverts) {
		dfpEnv.adverts.set(advert.id, advert);
	}

	adverts.forEach(queueAdvert);
	if (dfpEnv.shouldLazyLoad()) {
		displayLazyAds();
	} else {
		displayAds();
	}
};

export { fillStaticAdvertSlots };
