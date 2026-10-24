/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

// Execution requires a separately authorized, bounded browser/server session.
test('inspection hit targets, themed pinned separator and native scrolling remain aligned', async ({
  page,
}) => {
  await page.goto('/?demo=core');
  const scrollport = page.getByTestId('core-scrollport');
  await expect(page.getByRole('cell').first()).toBeVisible();
  await page.getByTestId('core-canvas').evaluate((canvas) => {
    const stage = canvas.closest('[dir="ltr"]');
    if (!(stage instanceof HTMLElement) || !stage.parentElement)
      throw new Error('Missing LTR stage');
    stage.parentElement.dir = 'rtl';
    stage.style.setProperty('--core-pinned-separator', 'rgb(210, 50, 90)');
  });
  const inspect = () =>
    scrollport.evaluate((element) => {
      const viewport = element.getBoundingClientRect();
      const x = viewport.left + element.clientLeft + 20;
      const y = viewport.top + element.clientTop + 48;
      const hit = document.elementFromPoint(x, y)?.closest('[role="cell"]');
      const region = element.querySelector<HTMLElement>(
        '[aria-rowindex="1"] [data-column-region="right"]',
      );
      if (!region) throw new Error('Missing right header region');
      const rect = region.getBoundingClientRect();
      const style = getComputedStyle(region, '::after');
      return {
        x,
        y,
        hitColumn: hit?.getAttribute('data-column-id'),
        rightEdge: rect.right,
        expectedRight: viewport.left + element.clientLeft + element.clientWidth,
        width: style.width,
        color: style.backgroundColor,
        intercept: style.pointerEvents,
        inset: style.insetInlineStart,
        top: element.scrollTop,
        left: element.scrollLeft,
      };
    });
  const before = await inspect();
  expect(before.hitColumn).toBe('c0');
  expect(before.rightEdge).toBeCloseTo(before.expectedRight, 0);
  expect(before).toMatchObject({
    width: '1px',
    color: 'rgb(210, 50, 90)',
    intercept: 'none',
    inset: '0px',
  });
  await page.mouse.move(before.x, before.y);
  await page.mouse.wheel(0, 64);
  await expect
    .poll(() => scrollport.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before.top);
  await page.mouse.wheel(64, 0);
  await expect
    .poll(() => scrollport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before.left);
  const after = await inspect();
  expect(after.hitColumn).toBe('c0');
  expect(after.rightEdge).toBeCloseTo(after.expectedRight, 0);
  expect(after.color).toBe('rgb(210, 50, 90)');
  expect(after.intercept).toBe('none');
});
