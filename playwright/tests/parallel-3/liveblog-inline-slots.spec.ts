import { expect, test } from '@playwright/test';
import { breakpoints } from '../../fixtures/breakpoints';
import type { BreakpointSizes } from '../../fixtures/breakpoints';
import { blogs } from '../../fixtures/pages';
import { cmpAcceptAll } from '../../lib/cmp';
import { loadPage } from '../../lib/load-page';
import { countLiveblogInlineSlots } from '../../lib/util';

const blogPages = blogs.filter(
	(page) =>
		'expectedMinInlineSlotsOnDesktop' in page &&
		'expectedMinInlineSlotsOnMobile' in page,
);

test.describe.serial('A minimum number of ad slots load', () => {
	blogPages.forEach(
		({
			path,
			expectedMinInlineSlotsOnDesktop,
			expectedMinInlineSlotsOnMobile,
		}) => {
			breakpoints.forEach(({ breakpoint, width, height }) => {
				const isMobile = breakpoint === 'mobile';
				const expectedMinSlotsOnPage =
					(isMobile
						? expectedMinInlineSlotsOnMobile
						: expectedMinInlineSlotsOnDesktop) ?? 999;

				test(`There are at least ${expectedMinSlotsOnPage} inline total slots at breakpoint ${breakpoint} at path ${path}`, async ({
					page,
				}) => {
					await page.setViewportSize({
						width,
						height,
					});

					await loadPage(page, path);
					await cmpAcceptAll(page);

					const foundSlots = await countLiveblogInlineSlots(
						page,
						isMobile,
					);

					expect(foundSlots).toBeGreaterThanOrEqual(
						expectedMinSlotsOnPage,
					);
				});
			});
		},
	);
});

test.describe('Correct set of slots are displayed', () => {
	const mobileBreakpoint = breakpoints.filter(
		({ breakpoint }) => breakpoint === 'mobile',
	)[0] as unknown as BreakpointSizes;

	const testBlog = blogs.filter(({ name }) => name === 'ad-limit');

	testBlog.forEach(({ path }) => {
		test(`on mobile, the mobile ad slots are displayed and desktop ad slots are hidden on ${path}`, async ({
			page,
		}) => {
			await page.setViewportSize({
				width: mobileBreakpoint.width,
				height: mobileBreakpoint.height,
			});

			await loadPage(page, path);
			await cmpAcceptAll(page);
			await loadPage(page, path);

			await page
				.getByTestId('liveblog-inline-mobile--top-above-nav')
				.scrollIntoViewIfNeeded();

			await expect(
				page.getByTestId('liveblog-inline-mobile--top-above-nav'),
			).toBeVisible({ timeout: 30_000 });

			await expect(
				page.getByTestId('liveblog-inline--inline1'),
			).not.toBeVisible({ timeout: 30_000 });
		});
	});

	testBlog.forEach(({ path }) => {
		breakpoints
			.filter(({ breakpoint }) => breakpoint !== 'mobile')
			.forEach(({ breakpoint, width, height }) => {
				test(`on ${breakpoint}, the desktop ad slots are displayed and the mobile ad slots are hidden on ${path}`, async ({
					page,
				}) => {
					await page.setViewportSize({
						width,
						height,
					});

					await loadPage(page, path);
					await cmpAcceptAll(page);
					await loadPage(page, path);

					await page
						.getByTestId('liveblog-inline--inline1')
						.scrollIntoViewIfNeeded();

					await expect(
						page.getByTestId('liveblog-inline--inline1'),
					).toBeVisible({ timeout: 30_000 });

					await expect(
						page.getByTestId(
							'liveblog-inline-mobile--top-above-nav',
						),
					).not.toBeVisible({ timeout: 30_000 });
				});
			});
	});
});
