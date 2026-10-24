/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

// Execution requires a separately authorized, bounded browser/server session.
test('both pinned edges suppress coincident center borders while preserving internal dividers', async ({
  page,
}) => {
  await page.goto('/?demo=core');
  const scrollport = page.getByTestId('core-scrollport');
  await page.getByTestId('core-canvas').evaluate((canvas) => {
    const stage = canvas.closest<HTMLElement>('[dir="ltr"]');
    if (!stage || !stage.parentElement) throw new Error('Missing stage');
    stage.style.width = '400px';
    stage.style.setProperty('--core-pinned-separator', 'rgb(210, 50, 90)');
    stage.style.setProperty('--core-border', 'rgb(72, 82, 92)');
    stage.style.setProperty('--core-surface', 'rgb(25, 30, 40)');
    stage.style.setProperty('--core-cell', 'rgba(45, 50, 60, 0.8)');
    stage.style.setProperty('--core-header', 'rgb(35, 40, 50)');
  });
  const centerWidth = () =>
    page
      .locator('[aria-rowindex="1"] [data-column-region="center"]')
      .evaluate((region) => region.getBoundingClientRect().width);
  await expect.poll(centerWidth).toBeGreaterThan(0);
  await expect.poll(centerWidth).toBeLessThan(200);
  for (const direction of ['ltr', 'rtl']) {
    await page.getByTestId('core-canvas').evaluate((canvas, direction) => {
      const stage = canvas.closest('[dir="ltr"]');
      if (!stage?.parentElement) throw new Error('Missing stage parent');
      stage.parentElement.dir = direction;
    }, direction);
    const width = await centerWidth();
    await scrollport.evaluate((element, left) => {
      element.scrollLeft = left;
    }, 200 - width);
    const edgeCell = page.locator('[aria-rowindex="1"] [data-column-id="c2"]');
    await expect(edgeCell).toHaveAttribute(
      'data-trailing-border',
      'suppressed',
    );
    await expect(edgeCell).toHaveCSS(
      'border-inline-end-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(
      page.locator('[aria-rowindex="1"] [data-column-id="c1"]'),
    ).toHaveCSS('border-inline-end-color', 'rgb(72, 82, 92)');
    const sides = await scrollport.evaluate((element) =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          '[aria-rowindex="1"] [data-column-region]',
        ),
        (region) => {
          const style = getComputedStyle(region);
          const line = getComputedStyle(region, '::after');
          return {
            region: region.dataset.columnRegion,
            backing: style.backgroundColor,
            isolation: style.isolation,
            z: style.zIndex,
            line: line.content,
            width: line.width,
            color: line.backgroundColor,
            end: line.insetInlineEnd,
            start: line.insetInlineStart,
            input: line.pointerEvents,
          };
        },
      ),
    );
    expect(sides).toMatchObject([
      {
        region: 'left',
        backing: 'rgb(25, 30, 40)',
        isolation: 'isolate',
        z: '1',
        width: '1px',
        color: 'rgb(210, 50, 90)',
        end: '0px',
        input: 'none',
      },
      {
        region: 'center',
        backing: 'rgb(25, 30, 40)',
        isolation: 'isolate',
        z: '0',
        line: 'none',
      },
      {
        region: 'right',
        backing: 'rgb(25, 30, 40)',
        isolation: 'isolate',
        z: '1',
        width: '1px',
        color: 'rgb(210, 50, 90)',
        start: '0px',
        input: 'none',
      },
    ]);
  }
  await page.getByRole('checkbox', { name: 'Pin first / last' }).uncheck();
  await expect(page.locator('[data-trailing-border="suppressed"]')).toHaveCount(
    0,
  );
});

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
