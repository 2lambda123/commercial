import { isString } from '@guardian/libs';
import { isInVariantSynchronous } from 'common/modules/experiments/ab';
import { elementsManager } from 'common/modules/experiments/tests/elements-manager';
import { getUrlVars } from 'lib/url';
import { dfpEnv } from './dfp/dfp-env';
import { renderAdvertLabel } from './dfp/render-advert-label';

type PreviewParameters = {
	assetPath: string;
	width?: string;
	height?: string;
};

const parsePreviewUrl = (): PreviewParameters | undefined => {
	const { gem_preview_asset_path, gem_preview_width, gem_preview_height } =
		getUrlVars();

	if (!isString(gem_preview_asset_path)) {
		return undefined;
	}

	const assetPath = gem_preview_asset_path;

	// Optional preview parameters

	const width = isString(gem_preview_width) ? gem_preview_width : undefined;

	const height = isString(gem_preview_height)
		? gem_preview_height
		: undefined;

	return {
		assetPath,
		width,
		height,
	};
};

const getSlots = () => {
	// Don't insert GEM assets into certain slots that are specific to other ad-servers
	const ignoredSlots = new Set(['dfp-ad--exclusion', 'dfp-ad--survey']);
	return [
		...document.querySelectorAll<HTMLElement>(dfpEnv.adSlotSelector),
	].filter((adSlot) => !ignoredSlots.has(adSlot.id));
};

const createIframe = (
	adSlot: HTMLElement,
	src: string,
	{
		title = 'GEM Preview Slot',
		width = '300px',
		height = '250px',
	}: { title?: string; width?: string; height?: string },
) => {
	const iframeNode = document.createElement('iframe');
	iframeNode.src = src;
	iframeNode.title = title;
	iframeNode.width = width;
	iframeNode.height = height;
	adSlot.appendChild(iframeNode);
};

const initElementsManager = (): Promise<void> => {
	if (!isInVariantSynchronous(elementsManager, 'variant')) {
		return Promise.resolve();
	}

	const previewParams = parsePreviewUrl();

	if (!previewParams) {
		return Promise.resolve();
	}

	const { assetPath, width, height } = previewParams;

	getSlots().forEach((adSlot) => {
		createIframe(adSlot, assetPath, { width, height });
		void renderAdvertLabel(adSlot);
	});

	return Promise.resolve();
};

export { initElementsManager };