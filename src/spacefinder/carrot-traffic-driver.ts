import { createAdSlot } from 'core/create-ad-slot';
import { getCurrentTweakpoint } from 'detect/detect-breakpoint';
import { commercialFeatures } from 'lib/commercial-features';
import { spaceFiller } from 'spacefinder/space-filler';
import type {
	SpacefinderRules,
	SpacefinderWriter,
} from 'spacefinder/spacefinder';
import { fillDynamicAdSlot } from '../dfp/fill-dynamic-advert-slot';
import fastdom from '../lib/fastdom-promise';

const bodySelector = '.article-body-commercial-selector';

const wideRules: SpacefinderRules = {
	bodySelector,
	slotSelector: ' > p',
	minAbove: 500,
	minBelow: 400,
	clearContentMeta: 0,
	selectors: {
		' .element-rich-link': {
			minAbove: 100,
			minBelow: 400,
		},
		' .element-image': {
			minAbove: 440,
			minBelow: 440,
		},

		' .player': {
			minAbove: 50,
			minBelow: 50,
		},
		' > h1': {
			minAbove: 50,
			minBelow: 50,
		},
		' > h2': {
			minAbove: 50,
			minBelow: 50,
		},
		' > *:not(p):not(h2):not(blockquote):not(#sign-in-gate)': {
			minAbove: 50,
			minBelow: 50,
		},
		' .ad-slot': {
			minAbove: 100,
			minBelow: 100,
		},
		' .element-pullquote': {
			minAbove: 400,
			minBelow: 400,
		},
		// Don't place carrot ads near newsletter sign-up blocks
		' > figure[data-spacefinder-role="inline"]': {
			minAbove: 400,
			minBelow: 400,
		},
	},
	fromBottom: true,
};

// anything below leftCol (1140) : desktop, tablet, ..., mobile
const desktopRules: SpacefinderRules = {
	...wideRules,
	selectors: {
		...wideRules.selectors,
		' .element-rich-link': {
			minAbove: 400,
			minBelow: 400,
		},
		' .ad-slot': {
			minAbove: 400,
			minBelow: 400,
		},
		' .ad-slot--im': {
			minAbove: 400,
			minBelow: 400,
		},
	},
};

const insertSlot: SpacefinderWriter = (paras) => {
	const slot = createAdSlot('carrot');
	const candidates = paras.slice(1);
	return fastdom
		.mutate(() => {
			if (candidates[0]?.parentNode) {
				candidates[0].parentNode.insertBefore(slot, candidates[0]);
			}
		})
		.then(() => void fillDynamicAdSlot(slot, true));
};

const getRules = (): SpacefinderRules => {
	switch (getCurrentTweakpoint()) {
		case 'leftCol':
		case 'wide':
			return wideRules;
		default:
			return desktopRules;
	}
};

export const initCarrot = (): Promise<boolean> => {
	if (commercialFeatures.carrotTrafficDriver) {
		return spaceFiller.fillSpace(getRules(), insertSlot, {
			waitForImages: true,
			waitForInteractives: true,
			pass: 'carrot',
		});
	}
	return Promise.resolve(false);
};
