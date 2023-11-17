import { adSizes } from 'core/ad-sizes';
import { createAdSlot } from 'core/create-ad-slot';
import { commercialFeatures } from 'lib/commercial-features';
import { getCurrentBreakpoint } from 'lib/detect/detect-breakpoint';
import fastdom from 'lib/fastdom-promise';
import { spaceFiller } from 'lib/spacefinder/space-filler';
import type {
	SpacefinderItem,
	SpacefinderRules,
	SpacefinderWriter,
} from 'lib/spacefinder/spacefinder';
import {
	computeStickyHeights,
	insertHeightStyles,
} from 'lib/spacefinder/sticky-inlines';
import { defineSlot } from '../define-slot';

type SlotName = Parameters<typeof createAdSlot>[0];

type ContainerOptions = {
	className?: string;
};

const articleBodySelector = '.article-body-commercial-selector';

const adSlotClassSelectorSizes = {
	minAbove: 500,
	minBelow: 500,
};

/**
 * Get the classname for an ad slot container
 *
 * We add 2 to the index because these are always ads added in the second pass.
 *
 * e.g. the 0th container inserted in pass 2 becomes `ad-slot-container--2` to match `inline2`
 *
 * @param i Index of winning paragraph
 * @returns The classname for container
 */
const getStickyContainerClassname = (i: number) => `ad-slot-container-${i + 2}`;

const wrapSlotInContainer = (
	ad: HTMLElement,
	options: ContainerOptions = {},
) => {
	const container = document.createElement('div');

	container.className = `ad-slot-container ${options.className ?? ''}`;

	container.appendChild(ad);
	return container;
};

const insertAdAtPara = async ({
	para,
	name,
	type,
	classes = '',
	containerOptions = {},
	inlineId,
}: {
	para: Node;
	name: string;
	type: SlotName;
	classes: string;
	containerOptions: ContainerOptions;
	inlineId: number;
}): Promise<void> => {
	const adSlot = createAdSlot(type, {
		name,
		classes,
	});

	const node = wrapSlotInContainer(adSlot, containerOptions);

	await fastdom.mutate(() => {
		if (para.parentNode) {
			para.parentNode.insertBefore(node, para);
		}
	});

	defineSlot(adSlot, name, inlineId === 1 ? 'inline' : 'inline-right');
};

// this facilitates a second filtering, now taking into account the candidates' position/size relative to the other candidates
const filterNearbyCandidates =
	(maximumAdHeight: number) =>
	(candidate: SpacefinderItem, lastWinner?: SpacefinderItem): boolean => {
		// No previous winner
		if (lastWinner === undefined) return true;

		return (
			Math.abs(candidate.top - lastWinner.top) - maximumAdHeight >=
			adSlotClassSelectorSizes.minBelow
		);
	};

const addMobileInlineAds = async () => {
	const rules: SpacefinderRules = {
		bodySelector: articleBodySelector,
		slotSelector: ' > p',
		minAbove: 200,
		minBelow: 200,
		selectors: {
			' > h2': {
				minAbove: 100,
				minBelow: 250,
			},
			' .ad-slot': adSlotClassSelectorSizes,
			' > :not(p):not(h2):not(.ad-slot):not(#sign-in-gate)': {
				minAbove: 35,
				minBelow: 200,
			},
		},
		filter: filterNearbyCandidates(adSizes.mpu.height),
	};

	const insertAds: SpacefinderWriter = async (paras) => {
		const slots = paras.map((para, i) =>
			insertAdAtPara({
				para,
				name: `inline${i + 1}`,
				type: 'inline',
				classes: 'inline',
				containerOptions: {},
				inlineId: i + 1,
			}),
		);
		await Promise.all(slots);
	};

	return spaceFiller.fillSpace(rules, insertAds, {
		waitForImages: true,
		waitForInteractives: true,
		pass: 'inline1',
	});
};

const addDesktopInlineAds = async () => {
	// For any other inline
	const rules: SpacefinderRules = {
		bodySelector: articleBodySelector,
		slotSelector: ' > p',
		minAbove: 1000,
		minBelow: 300,
		selectors: {
			' .ad-slot': adSlotClassSelectorSizes,
			' [data-spacefinder-role="immersive"]': {
				minAbove: 0,
				minBelow: 600,
			},
		},
		filter: filterNearbyCandidates(adSizes.halfPage.height),
	};

	const insertAds: SpacefinderWriter = async (paras) => {
		// Compute the height of containers in which ads will remain sticky
		const stickyContainerHeights = await computeStickyHeights(
			paras,
			articleBodySelector,
		);

		void insertHeightStyles(
			stickyContainerHeights.map((height, index) => [
				getStickyContainerClassname(index),
				height,
			]),
		);

		const slots = paras.map((para, i) => {
			const inlineId = i + 1;

			let containerClasses = '';

			if (inlineId !== 1) {
				containerClasses +=
					' offset-right ad-slot--offset-right ad-slot-container--offset-right';
			}

			const containerOptions = {
				className: containerClasses,
			};

			return insertAdAtPara({
				para,
				name: `inline${inlineId}`,
				type: 'inline',
				classes: 'inline',
				containerOptions,
				inlineId,
			});
		});
		await Promise.all(slots);
	};

	return spaceFiller.fillSpace(rules, insertAds, {
		waitForImages: true,
		waitForInteractives: true,
		pass: 'inline1',
	});
};

const addInlineAds = (): Promise<boolean | void> =>
	getCurrentBreakpoint() === 'mobile'
		? addMobileInlineAds()
		: addDesktopInlineAds();

const initArticleInline = async (): Promise<void> => {
	// do we need to rerun for the sign-in gate?
	if (!commercialFeatures.articleBodyAdverts) {
		return;
	}

	await addInlineAds();
};

export { initArticleInline };
