import type { BrowserContext, Cookie, Page } from '@playwright/test';
import type { UserFeaturesResponse } from '../../src/types/membership';

type Stage = 'code' | 'prod' | 'dev';

const normalizeStage = (stage: string): Stage =>
	['code', 'prod', 'dev'].includes(stage) ? (stage as Stage) : 'dev';

/**
 * Set the stage via environment variable STAGE
 * e.g. `STAGE=code yarn playwright test`
 */
const getStage = (): Stage => {
	// TODO check playwright picks up the STAGE env var
	const stage = process.env.STAGE;
	return normalizeStage(stage?.toLowerCase() ?? 'dev');
};

const hostnames = {
	code: 'https://code.dev-theguardian.com',
	prod: 'https://www.theguardian.com',
	dev: 'http://localhost:3030',
} as const;

const getHost = (stage?: Stage | undefined) => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive runtime
	return hostnames[stage ?? getStage()] ?? hostnames.dev;
};

/**
 * Generate the path for the request to DCR
 *
 * @param {'dev' | 'code' | 'prod'}  stage
 * @param type
 * @param path
 * @param fixtureId
 * @returns
 */
const getPath = (
	stage: Stage,
	type: 'article' | 'liveblog' | 'front' = 'article',
	path: string,
	fixtureId?: string,
) => {
	if (stage === 'dev') {
		const dcrContentType =
			type === 'liveblog' || type === 'article' ? 'Article' : 'Front';
		if (fixtureId) {
			return `${dcrContentType}/http://localhost:3031/renderFixture/${fixtureId}/${path}`;
		}
		return `${dcrContentType}/https://www.theguardian.com${path}`;
	}
	return path;
};

/**
 * Generate a full URL i.e domain and path
 *
 * @param {'dev' | 'code' | 'prod'} stage
 * @param {string} path
 * @param {'article' | 'liveblog' | 'front' } type
 * @adtest string
 * @fixtureId string
 * @returns {string} The full URL
 */
const getTestUrl = (
	stage: Stage,
	path: string,
	type: 'article' | 'liveblog' | 'front' = 'article',
	adtest = 'fixed-puppies-ci',
	fixtureId?: string,
) => {
	const url = new URL(getPath(stage, type, path, fixtureId), getHost(stage));

	if (type === 'liveblog') {
		url.searchParams.append('live', '1');
	}

	url.searchParams.append('adtest', adtest);

	// force an invalid epic so it is not shown
	url.searchParams.append('force-epic', '9999:CONTROL');

	return url.toString();
};

const setupFakeLogin = async (
	page: Page,
	context: BrowserContext,
	subscriber = true,
) => {
	const bodyOverride: UserFeaturesResponse = {
		userId: '107421393',
		digitalSubscriptionExpiryDate: '2999-01-01',
		showSupportMessaging: false,
		contentAccess: {
			member: false,
			paidMember: false,
			recurringContributor: false,
			digitalPack: true,
			paperSubscriber: false,
			guardianWeeklySubscriber: false,
		},
	};

	if (!subscriber) {
		bodyOverride.contentAccess.digitalPack = false;
		delete bodyOverride.digitalSubscriptionExpiryDate;
	}

	await context.addCookies([
		{
			name: 'GU_U',
			value: 'WyIzMjc5Nzk0IiwiIiwiSmFrZTkiLCIiLDE2NjA4MzM3NTEyMjcsMCwxMjEyNjgzMTQ3MDAwLHRydWVd.MC0CFQCIbpFtd0J5IqK946U1vagzLgCBkwIUUN3UOkNfNN8jwNE3scKfrcvoRSg',
			domain: 'localhost',
			path: '/',
		},
	]);

	await page.route(
		'https://members-data-api.theguardian.com/user-attributes/me**',
		(route) => {
			return route.fulfill({
				body: JSON.stringify(bodyOverride),
			});
		},
		{ times: 1 },
	);
};

const clearCookie = async (context: BrowserContext, cookieName: string) => {
	const cookies = await context.cookies();
	const filteredCookies = cookies.filter(
		(cookie: Cookie) => cookie.name !== cookieName,
	);
	await context.clearCookies();
	await context.addCookies(filteredCookies);
};

const fakeLogOut = async (page: Page, context: BrowserContext) =>
	await clearCookie(context, 'GU_U');

const waitForSlot = async (page: Page, slot: string) => {
	const slotId = `#dfp-ad--${slot}`;
	// create a locator for the slot
	const slotLocator = page.locator(slotId);
	// check that the ad slot is present on the page
	await slotLocator.isVisible();
	// scroll to it
	await slotLocator.scrollIntoViewIfNeeded();
	// iframe locator
	const iframe = page.locator(`${slotId} iframe`);
	// wait for the iframe
	await iframe.waitFor({ state: 'visible', timeout: 120000 });
};

export { fakeLogOut, setupFakeLogin, getStage, getTestUrl, waitForSlot };