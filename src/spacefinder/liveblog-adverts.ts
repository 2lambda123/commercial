import { adSizes } from 'core/ad-sizes';
import { createAdSlot } from 'core/create-ad-slot';
import { getCurrentBreakpoint } from 'detect/detect-breakpoint';
import { fillDynamicAdSlot } from 'dfp/fill-dynamic-advert-slot';
import { commercialFeatures } from 'lib/commercial-features';
import fastdom from 'lib/fastdom-promise';
import { spaceFiller } from 'spacefinder/space-filler';
import type {
	SpacefinderItem,
	SpacefinderOptions,
	SpacefinderRules,
	SpacefinderWriter,
} from 'spacefinder/spacefinder';

/**
 * Maximum number of inline ads to display on the page.
 */
const MAX_ADS = 8;

/**
 * Multiplier of screen height that sets the minimum distance that two ads can be placed.
 */
const AD_GAP_MULTIPLIER = 1.5;

let AD_COUNTER = 0;

const getSlotName = (isMobile: boolean, slotCounter: number): string => {
	if (isMobile) {
		return slotCounter === 0 ? 'top-above-nav' : `inline${slotCounter}`;
	}

	return `inline${slotCounter + 1}`;
};

const insertAdAtPara = (para: Node) => {
	const isMobile = getCurrentBreakpoint() === 'mobile';

	const container: HTMLElement = document.createElement('div');
	container.className = `ad-slot-container ad-slot-${
		isMobile ? 'mobile' : 'desktop'
	}`;

	const ad = createAdSlot('inline', {
		name: getSlotName(isMobile, AD_COUNTER),
		classes: `liveblog-inline${isMobile ? '--mobile' : ''}`,
	});

	container.appendChild(ad);

	return fastdom
		.mutate(() => {
			if (para.parentNode) {
				/* ads are inserted after the block on liveblogs */
				para.parentNode.insertBefore(container, para.nextSibling);
			}
		})
		.then(async () =>
			fillDynamicAdSlot(ad, false, {
				phablet: [
					adSizes.outstreamDesktop,
					adSizes.outstreamGoogleDesktop,
				],
				desktop: [
					adSizes.outstreamDesktop,
					adSizes.outstreamGoogleDesktop,
				],
			}),
		);
};

const insertAds: SpacefinderWriter = async (paras) => {
	const fastdomPromises = [];
	for (let i = 0; i < paras.length && AD_COUNTER < MAX_ADS; i += 1) {
		const para = paras[i];
		if (para?.parentNode) {
			const result = insertAdAtPara(para);
			fastdomPromises.push(result);
			AD_COUNTER += 1;
		}
	}

	await Promise.all(fastdomPromises);
};

const fillSpace = (rules: SpacefinderRules) => {
	const options: SpacefinderOptions = { pass: 'inline1' };

	return spaceFiller.fillSpace(rules, insertAds, options);
};

const shouldInsertAd = (
	blockAboveAd: SpacefinderItem,
	candidateBlock: SpacefinderItem,
	windowHeight: number,
) =>
	Math.abs(blockAboveAd.bottom - candidateBlock.bottom) >
	windowHeight * AD_GAP_MULTIPLIER;

const getSpaceFillerRules = (
	startBlock: HTMLElement,
	windowHeight: number,
): SpacefinderRules => {
	// This is always the content block above the highest inline ad slot on the page.
	// When a new ad slot is inserted, this will become the first content block above it.
	let prevSlot: SpacefinderItem | undefined;
	const filterSlot = (slot: SpacefinderItem) => {
		if (!prevSlot) {
			prevSlot = slot;
			return false;
		}

		if (shouldInsertAd(prevSlot, slot, windowHeight)) {
			prevSlot = slot;
			return true;
		}

		return false;
	};

	return {
		bodySelector: '.js-liveblog-body',
		slotSelector: ' > .block',
		fromBottom: true,
		startAt: startBlock,
		absoluteMinAbove: 0,
		minAbove: 0,
		minBelow: 0,
		clearContentMeta: 0,
		selectors: {},
		filter: filterSlot,
	};
};

/**
 * Finds the first content block to start searching for space to insert ad slots.
 *
 * If there is at least one inline ad slot on the page, this will be the content
 * block above it (there'll be at least one - we never insert ads above content blocks).
 *
 * if there are no inline ad slots on the page, this is the content block at the bottom of the page.
 */
const getFirstContentBlock = async (
	topAdvert: Element | null,
): Promise<Element | null> => {
	if (topAdvert === null) {
		return fastdom.measure(() => {
			const allBlocks = document.querySelectorAll(
				'.js-liveblog-body > .block',
			);
			return allBlocks[allBlocks.length - 1] ?? null;
		});
	}

	const prevElement = topAdvert.previousSibling as Element | null;
	if (prevElement === null) return null;

	if (prevElement.classList.contains('block')) {
		return prevElement;
	}

	return getFirstContentBlock(prevElement);
};

const lookForSpacesForAdSlots = async () => {
	// window.mockLiveUpdate({
	// 	numNewBlocks: 4,
	// 	html:
	// 		'<article id="block-656081891e3862dd912f4123" class="block dcr-1p37fdd-LiveBlockContainer"><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /></article>' +
	// 		'<article id="block-656081891e3862dd912f4234" class="block dcr-1p37fdd-LiveBlockContainer"><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /></article>' +
	// 		'<article id="block-656081891e3862dd912f4345" class="block dcr-1p37fdd-LiveBlockContainer"><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /></article>' +
	// 		'<article id="block-656081891e3862dd912f4456" class="block dcr-1p37fdd-LiveBlockContainer"><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /><p>New block</p><br /></article>',
	// 	mostRecentBlockId: 'abc',
	// });

	const isMobile = getCurrentBreakpoint() === 'mobile';
	const slotSelector = `.ad-slot-container.ad-slot-${
		isMobile ? 'mobile' : 'desktop'
	}`;

	return fastdom
		.measure(() => {
			const numSlots = document.querySelectorAll(slotSelector).length;
			if (numSlots >= MAX_ADS) {
				throw new Error('At ad slot limit. Cannot insert any more.');
			}

			AD_COUNTER = numSlots;
		})
		.then(() => {
			const topAdvert = document.querySelector(
				`.js-liveblog-body > ${slotSelector}`,
			);

			return getFirstContentBlock(topAdvert);
		})
		.then((firstContentBlock) => {
			if (!firstContentBlock) {
				throw new Error(
					'Cannot find a content block to start inserting new ads',
				);
			}

			return fastdom
				.measure(() => document.documentElement.clientHeight)
				.then((windowHeight) =>
					getSpaceFillerRules(
						firstContentBlock as HTMLElement,
						windowHeight,
					),
				)
				.then(fillSpace);
		});
};

const startListening = () => {
	// eslint-disable-next-line no-use-before-define -- circular reference
	document.addEventListener('liveblog:blocks-updated', onUpdate);
};

const stopListening = () => {
	// eslint-disable-next-line no-use-before-define -- circular reference
	document.removeEventListener('liveblog:blocks-updated', onUpdate);
};

const onUpdate = (): void => {
	stopListening();

	void lookForSpacesForAdSlots();
};

/**
 * This module will insert inline ad slots into the page if there is space available.
 *
 * When new content is pushed to a liveblog, an event will be fired from DCR and
 * listened for here. Starting at the lowest content block that is directly above
 * an inline ad slot, it will inspect each content block above it and insert
 * ads in appropriate spaces.
 */
export const init = (): Promise<void> => {
	if (!commercialFeatures.liveblogAdverts) {
		return Promise.resolve();
	}

	void startListening();

	// setTimeout(() => {
	// 	console.log('dispatchEvent');
	// 	document.dispatchEvent(new CustomEvent('liveblog:blocks-updated'));
	// }, 10000);

	return Promise.resolve();
};

export const _ = { getSlotName };
