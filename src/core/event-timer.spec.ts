//
import { EventTimer, PageEvents, SlotEvents } from './event-timer';

const mockGetEntriesByName = (names: string[]) =>
	jest.fn((name: string) =>
		names.includes(name)
			? [
					{
						duration: 1,
						entryType: 'mark',
						name: 'commercial event',
						startTime: 1,
					},
			  ]
			: [],
	);

const mockMark = jest.fn(
	(name: string): PerformanceMark => ({
		name,
		duration: 1,
		entryType: 'mark',
		startTime: 1,
		detail: {},
		toJSON: () => '',
	}),
);

const performance = {
	now: jest.fn(),
	mark: mockMark,
	getEntriesByName: jest.fn().mockReturnValue([]),
};

const MARK_NAME = PageEvents.CommercialStart;
const MARK_LONG_NAME = `gu.commercial.${MARK_NAME}`;
const CMP_INIT = 'cmp-init';
const CMP_GOT_CONSENT = 'cmp-got-consent';

const DEFAULT_CONFIG = {
	isDotcomRendering: true,
	ophan: { pageViewId: 'pv_id_1234567890' },
	page: {
		dcrCouldRender: true,
		edition: 'UK' as const,
		isPreview: false,
		isSensitive: false,
		pageId: 'world/uk',
		section: 'uk-news',
		videoDuration: 63,
		webPublicationDate: 608857200,
	},
};

describe('EventTimer', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'performance', {
			configurable: true,
			enumerable: true,
			value: performance,
			writable: true,
		});

		window.guardian = {
			config: {
				...DEFAULT_CONFIG,
				googleAnalytics: {
					trackers: {
						editorial: 'gaTrackerTest',
					},
				},
			},
		} as typeof window.guardian;

		EventTimer.init();
	});

	it('get correct cmp events', () => {
		const performanceCMP = {
			now: jest.fn(),
			mark: jest.fn(),
			getEntriesByName: mockGetEntriesByName([CMP_INIT, CMP_GOT_CONSENT]),
		};
		Object.defineProperty(window, 'performance', {
			configurable: true,
			enumerable: true,
			value: performanceCMP,
			writable: true,
		});
		const eventTimer = EventTimer.get();
		expect(Array.from(eventTimer.events.keys())).toHaveLength(2);
		expect(Array.from(eventTimer.events.keys()).sort()).toEqual(
			[CMP_GOT_CONSENT, CMP_INIT].sort(),
		);
	});

	it('get correct cmp events with additional event mark', () => {
		const performanceCMP = {
			now: jest.fn(),
			mark: mockMark,
			getEntriesByName: mockGetEntriesByName([
				MARK_LONG_NAME,
				CMP_INIT,
				CMP_GOT_CONSENT,
			]),
		};
		Object.defineProperty(window, 'performance', {
			configurable: true,
			enumerable: true,
			value: performanceCMP,
			writable: true,
		});
		const eventTimer = EventTimer.get();
		eventTimer.trigger(MARK_NAME);
		expect(Array.from(eventTimer.events.keys())).toHaveLength(3);
		expect(Array.from(eventTimer.events.keys()).sort()).toEqual(
			[CMP_INIT, CMP_GOT_CONSENT, MARK_NAME].sort(),
		);
	});

	it('mark produces correct event', () => {
		const eventTimer = EventTimer.get();
		eventTimer.trigger(MARK_NAME);
		expect(eventTimer.events.get(MARK_NAME)).toBeDefined();
		expect(eventTimer.events.get(MARK_NAME)?.startTime).toBe(1);
	});

	it('calling trigger with performance undefined produces no events', () => {
		Object.defineProperty(window, 'performance', {
			configurable: true,
			enumerable: true,
			value: undefined,
			writable: true,
		});
		const eventTimer = EventTimer.get();
		eventTimer.trigger(MARK_NAME);
		expect(Array.from(eventTimer.events.keys()).length).toBe(0);
	});

	it('when retrieved and mark is undefined produce no events', () => {
		const performance = {
			now: jest.fn(),
			mark: undefined,
			getEntriesByName: jest.fn().mockReturnValue([]),
		};
		Object.defineProperty(window, 'performance', {
			configurable: true,
			enumerable: true,
			value: performance,
			writable: true,
		});
		const eventTimer = EventTimer.get();
		eventTimer.trigger(MARK_NAME);
		expect(Array.from(eventTimer.events.keys()).length).toBe(0);
	});

	// it('trigger first slotReady event', () => {
	// 	const eventTimer = EventTimer.get();
	// 	eventTimer.trigger(SlotEvents.SlotReady, TrackedSlots.Inline1);
	// 	expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
	// 		['gu.commercial.first-slotReady'],
	// 	]);

	// 	expect(trackEvent).toHaveBeenCalledWith(
	// 		'Commercial Events',
	// 		SlotEvents.SlotReady,
	// 		'first-slotReady',
	// 	);
	// });

	// it('triggering two slotReady events causes one trigger and one track', () => {
	// 	const eventTimer = EventTimer.get();
	// 	eventTimer.trigger(SlotEvents.SlotReady, TrackedSlots.Inline1);
	// 	eventTimer.trigger(SlotEvents.SlotReady, TrackedSlots.Inline1);

	// 	expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
	// 		['gu.commercial.first-slotReady'],
	// 	]);

	// 	expect(trackEvent).toHaveBeenCalledTimes(1);

	// 	expect(trackEvent).toHaveBeenCalledWith(
	// 		'Commercial Events',
	// 		SlotEvents.SlotReady,
	// 		'first-slotReady',
	// 	);
	// });

	it('trigger top-above-nav slotReady event', () => {
		const eventTimer = EventTimer.get();
		eventTimer.trigger(SlotEvents.SlotReady, 'top-above-nav');
		expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
			['gu.commercial.top-above-nav-slotReady'],
		]);
	});

	it('trigger two top-above-nav slotReady events', () => {
		const eventTimer = EventTimer.get();
		eventTimer.trigger(SlotEvents.SlotReady, 'top-above-nav');
		eventTimer.trigger(SlotEvents.SlotReady, 'top-above-nav');

		expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
			['gu.commercial.top-above-nav-slotReady'],
		]);
	});

	it('trigger commercial start page event', () => {
		const eventTimer = EventTimer.get();
		eventTimer.trigger(PageEvents.CommercialStart);
		expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
			['gu.commercial.commercialStart'],
		]);
	});

	it('trigger commercial end page event', () => {
		const eventTimer = EventTimer.get();
		eventTimer.trigger(PageEvents.CommercialModulesLoaded);
		expect((window.performance.mark as jest.Mock).mock.calls).toEqual([
			['gu.commercial.commercialModulesLoaded'],
		]);
	});

	it('handles no experimental properties', () => {
		const eventTimer = EventTimer.get();
		expect(eventTimer.properties).toEqual({});
	});

	describe('experimental window properties', () => {
		it('sets connection', () => {
			// @ts-expect-error -- we’re overriding a readonly value
			window.navigator.connection = {};
		});

		it('handles experimental property window.navigator.connection', () => {
			const eventTimer = EventTimer.get();
			expect(eventTimer.properties).toEqual({});
		});

		it('sets values', () => {
			// @ts-expect-error -- we’re overriding a readonly value
			window.navigator.connection = {
				type: 'other',
				downlink: 2,
				effectiveType: '3g',
			};
		});

		it('handles experimental property window.navigator.connection', () => {
			const eventTimer = EventTimer.get();
			expect(eventTimer.properties).toEqual({
				effectiveType: '3g',
				downlink: 2,
				type: 'other',
			});
		});

		it('remove values', () => {
			// @ts-expect-error -- we’re resetting a readonly value
			delete window.navigator.connection;
		});
	});
});
