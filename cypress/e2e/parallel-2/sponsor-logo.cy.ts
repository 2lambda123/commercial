import { getStage, getTestUrl } from '../../lib/util';

describe('sponsorshipLogo', () => {
	beforeEach(() => {
		cy.useConsentedSession('sponsorship-logo');
	});

	it('sponsor logo ad is correctly filled in thrasher fixture', () => {
		const fixture = {
			pressedPage: {
				collections: [
					{
						id: '37eb5448-482f-4e0e-9850-fbfb25efbe78',
						displayName: 'Thrasher Test',
						curated: [
							{
								properties: {
									isBreaking: false,
									showMainVideo: false,
									showKickerTag: false,
									showByline: false,
									imageSlideshowReplace: false,
									isLiveBlog: false,
									isCrossword: false,
									byline: 'Guardian Visuals',
									webTitle: '',
									embedType: 'interactive',
									embedUri:
										'https://content.guardianapis.com/atom/interactive/interactives/thrashers/2023/01/us-soccer-thrasher/default',
									maybeFrontPublicationDate: 1691057681991,
									href: 'https://content.guardianapis.com/atom/interactive/interactives/thrashers/2023/01/us-soccer-thrasher/default',
									webUrl: 'https://content.guardianapis.com/atom/interactive/interactives/thrashers/2023/01/us-soccer-thrasher/default',
									editionBrandings: [],
									atomId: 'atom/interactive/interactives/thrashers/2023/01/us-soccer-thrasher/default',
								},
								header: {
									isVideo: false,
									isComment: false,
									isGallery: false,
									isAudio: false,
									headline: 'Default — default',
									url: 'snap/1691057660962',
									hasMainVideoElement: false,
								},
								card: {
									id: 'snap/1691057660962',
									cardStyle: {
										type: 'ExternalLink',
									},
									shortUrl: '',
									group: '0',
									isLive: false,
								},
								discussion: {
									isCommentable: false,
									isClosedForComments: false,
								},
								display: {
									isBoosted: false,
									showBoostedHeadline: false,
									showQuotedHeadline: false,
									imageHide: false,
									showLivePlayable: false,
								},
								format: {
									design: 'ArticleDesign',
									theme: 'NewsPillar',
									display: 'StandardDisplay',
								},
								enriched: {
									embedHtml: `<div class="ad-slot-container">
										<div
										id="dfp-ad--sponsor-logo"
										data-link-name="ad slot sponsor-logo"
										data-name="sponsor-logo"
										aria-hidden="true"
										class="js-ad-slot ad-slot ad-slot--sponsor-logo ad-slot--rendered"
										data-label="false"
										data-refresh="false"></div></div>`,
									embedCss: '',
									embedJs: '',
								},
								type: 'LinkSnap',
							},
						],
						backfill: [],
						treats: [],
						lastUpdated: 1691057753473,
						href: 'atom/interactive/interactives/thrashers/2019/12/charity-appeal/default',
						collectionType: 'fixed/thrasher',
						uneditable: false,
						showTags: false,
						showSections: false,
						hideKickers: false,
						showDateHeader: false,
						showLatestUpdate: false,
						config: {
							displayName: 'Thrasher Test',
							collectionType: 'fixed/thrasher',
							href: 'atom/interactive/interactives/thrashers/2019/12/charity-appeal/default',
							uneditable: false,
							showTags: false,
							showSections: false,
							hideKickers: false,
							showDateHeader: false,
							showLatestUpdate: false,
							excludeFromRss: false,
							showTimestamps: false,
							hideShowMore: false,
							platform: 'Any',
						},
						hasMore: false,
					},
				],
			},
		};
		const path = getTestUrl({
			stage: getStage(),
			path: 'uk',
			type: 'front',
			adtest: undefined,
			fixture,
		});
		cy.visit(path);

		// Check that the top-above-nav ad slot is on the page
		cy.get('#dfp-ad--sponsor-logo').should('exist');

		// creative isn't loaded unless slot is in view
		cy.get('#dfp-ad--sponsor-logo').scrollIntoView();

		// Check that an iframe is placed inside the ad slot
		cy.findAdSlotIframeBySlotId('dfp-ad--sponsor-logo').should('exist');
	});

	it('sponsor logo ad is filled after firing a custom event from a thrasher fixture', () => {
		// Construct a path for a page containing a thrasher
		// This thrasher inserts a sponsor logo slot after an artificial delay
		// Then fires a custom event to fill the slot
		const path = getTestUrl(
			getStage(),
			'uk',
			'front',
			undefined, // use the default ad test
			'advertThatFiresEventInThrasher',
		);
		cy.visit(path);

		// Check that the top-above-nav ad slot is on the page
		cy.get('#dfp-ad--sponsor-logo').should('exist');

		// creative isn't loaded unless slot is in view
		cy.get('#dfp-ad--sponsor-logo').scrollIntoView();

		// Check that an iframe is placed inside the ad slot
		cy.findAdSlotIframeBySlotId('dfp-ad--sponsor-logo').should('exist');
	});
});
