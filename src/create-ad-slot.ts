import type { AdSize, SizeMapping } from './ad-sizes';
import { adSizes } from './ad-sizes';

const adSlotIdPrefix = 'dfp-ad--';

type AdSlotConfig = {
	sizeMappings: SizeMapping;
	label?: boolean;
	refresh?: boolean;
	name?: string;
};

type SlotName =
	| 'im'
	| 'high-merch'
	| 'high-merch-lucky'
	| 'high-merch-paid'
	| 'inline'
	| 'mostpop'
	| 'comments'
	| 'top-above-nav'
	| 'carrot'
	| 'epic'
	| 'mobile-sticky';

type AdSlotConfigs = Record<SlotName, AdSlotConfig>;

type CreateSlotOptions = {
	classes?: string;
	name?: string;
	sizes?: Record<string, AdSize[]>;
};

const commonSizeMappings: SizeMapping = {
	mobile: [
		adSizes.outOfPage,
		adSizes.empty,
		adSizes.outstreamMobile,
		adSizes.mpu,
		adSizes.googleCard,
		adSizes.fluid,
	],
	phablet: [
		adSizes.outOfPage,
		adSizes.empty,
		adSizes.outstreamMobile,
		adSizes.mpu,
		adSizes.googleCard,
		adSizes.fluid,
	],
	desktop: [
		adSizes.outOfPage,
		adSizes.empty,
		adSizes.mpu,
		adSizes.googleCard,
		adSizes.fluid,
	],
};

/**
 * mark: 432b3a46-90c1-4573-90d3-2400b51af8d0
 * Some of these may or may not need to be synced for with the sizes in ./ad-sizes.ts
 * these were originally from frontend, ad-sizes.ts ones were in DCR.
 **/

const adSlotConfigs: AdSlotConfigs = {
	im: {
		label: false,
		refresh: false,
		sizeMappings: {
			mobile: [
				adSizes.outOfPage,
				adSizes.empty,
				adSizes.inlineMerchandising,
				adSizes.fluid,
			],
		},
	},
	'high-merch': {
		label: false,
		refresh: false,
		name: 'merchandising-high',
		sizeMappings: {
			mobile: [
				adSizes.outOfPage,
				adSizes.empty,
				adSizes.merchandisingHigh,
				adSizes.fluid,
			],
		},
	},
	'high-merch-lucky': {
		label: false,
		refresh: false,
		name: 'merchandising-high-lucky',
		sizeMappings: {
			mobile: [adSizes.outOfPage, adSizes.empty, adSizes.fluid],
		},
	},
	'high-merch-paid': {
		label: false,
		refresh: false,
		name: 'merchandising-high',
		sizeMappings: {
			mobile: [
				adSizes.outOfPage,
				adSizes.empty,
				adSizes.merchandisingHighAdFeature,
				adSizes.fluid,
			],
		},
	},
	inline: {
		sizeMappings: commonSizeMappings,
	},
	mostpop: {
		sizeMappings: commonSizeMappings,
	},
	comments: {
		sizeMappings: commonSizeMappings,
	},
	'top-above-nav': {
		sizeMappings: {
			mobile: [
				adSizes.outOfPage,
				adSizes.empty,
				adSizes.fabric,
				adSizes.outstreamMobile,
				adSizes.mpu,
				adSizes.fluid,
			],
		},
	},
	carrot: {
		label: false,
		refresh: false,
		name: 'carrot',
		sizeMappings: {
			mobile: [adSizes.fluid],
		},
	},
	epic: {
		label: false,
		refresh: false,
		name: 'epic',
		sizeMappings: {
			mobile: [adSizes.fluid],
		},
	},
	'mobile-sticky': {
		label: true,
		refresh: true,
		name: 'mobile-sticky',
		sizeMappings: {
			mobile: [adSizes.mobilesticky],
		},
	},
};

/**
  Returns an adSlot HTMLElement which is the main DFP slot.

  Insert that element as siblings at the place you want adverts to appear.

  Note that for the DFP slot to be filled by GTP, you'll have to
  use addSlot from add-slot.js
*/
const createAdSlotElement = (
	name: string,
	attrs: Record<string, string>,
	classes: string[],
): HTMLElement => {
	const id = `${adSlotIdPrefix}${name}`;

	// 3562dc07-78e9-4507-b922-78b979d4c5cb
	if (window.guardian.config?.isDotcomRendering && name === 'top-above-nav') {
		// This is to prevent a problem that appeared with DCR.
		// We are simply making sure that if we are about to
		// introduce dfp-ad--top-above-nav then there isn't already one.
		const node = document.getElementById(id);
		if (node?.parentNode) {
			const pnode = node.parentNode;
			console.log(`warning: cleaning up dom node id: dfp-ad--${name}`);
			pnode.removeChild(node);
		}
	}

	// The 'main' adSlot
	const adSlot = document.createElement('div');
	adSlot.id = id;
	adSlot.className = `js-ad-slot ad-slot ${classes.join(' ')}`;
	adSlot.setAttribute('data-link-name', `ad slot ${name}`);
	adSlot.setAttribute('data-name', name);
	adSlot.setAttribute('aria-hidden', 'true');
	Object.entries(attrs).forEach(([k, v]) => adSlot.setAttribute(k, v));

	return adSlot;
};

/**
 * Split class names and prefix all with ad-slot--${className}
 */
const createClasses = (
	slotName: string,
	classes?: string,
): Array<`ad-slot--${string}`> =>
	[...(classes?.split(' ') ?? []), slotName].map<`ad-slot--${string}`>(
		(className: string) => `ad-slot--${className}`,
	);

/**
 * Given default size mappings and additional size mappings from
 * the createAdSlot options parameter.
 *
 * 1. Check that the options size mappings use known device names
 * 2. If so concat the size mappings
 *
 */
const concatSizeMappings = (
	defaultSizeMappings: SizeMapping,
	optionSizeMappings: CreateSlotOptions['sizes'],
): SizeMapping => {
	if (!optionSizeMappings) return defaultSizeMappings;
	const concatenatedSizeMappings: SizeMapping = { ...defaultSizeMappings };
	const optionDevices = Object.keys(optionSizeMappings); // ['mobile', 'desktop']

	for (let i = 0; i < optionDevices.length; i++) {
		const device = optionDevices[i] as keyof SizeMapping;
		if (optionSizeMappings[device] && defaultSizeMappings[device]) {
			const optionSizeMappingsForDevice = optionSizeMappings[device];
			const defaultSizeMappingsForDevice = defaultSizeMappings[device];

			if (defaultSizeMappingsForDevice && optionSizeMappingsForDevice) {
				// TODO can we do concatenatedSizeMappings[device]?.concat ?
				concatenatedSizeMappings[device] = (
					concatenatedSizeMappings[device] ?? []
				).concat(optionSizeMappingsForDevice);
			}
		}
	}
	return concatenatedSizeMappings;
};

/**
 * Convert size mappings to a string that will be added to the ad slot
 * data attributes.
 *
 * e.g. { desktop: [[320,250], [320, 280]] } => { desktop: '320,250|320,280' }
 *
 */
const covertSizeMappingsToStrings = (
	sizeMappings: SizeMapping,
): Record<string, string> =>
	Object.entries(sizeMappings).reduce(
		(
			result: Record<string, string>,
			[device, sizes]: [string, AdSize[]],
		) => {
			result[device] = sizes.join('|');
			return result;
		},
		{},
	);

/**
 * Prefix all object keys with data-${key}
 */
const createDataAttributes = (
	attrs: Record<string, string>,
): Record<`data-${string}`, string> =>
	Object.entries(attrs).reduce(
		(result: Record<string, string>, [key, value]) => {
			result[`data-${key}`] = value;
			return result;
		},
		{},
	);

export const createAdSlot = (
	name: SlotName,
	options: CreateSlotOptions = {},
): HTMLElement => {
	const adSlotConfig = adSlotConfigs[name];
	const slotName = options.name ?? adSlotConfig.name ?? name;

	const sizeMappings = concatSizeMappings(
		adSlotConfig.sizeMappings,
		options.sizes,
	);

	const attributes = covertSizeMappingsToStrings(sizeMappings);

	if (adSlotConfig.label === false) {
		attributes.label = 'false';
	}

	if (adSlotConfig.refresh === false) {
		attributes.refresh = 'false';
	}

	return createAdSlotElement(
		slotName,
		createDataAttributes(attributes),
		createClasses(slotName, options.classes),
	);
};