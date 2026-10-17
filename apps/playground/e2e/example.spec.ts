import { test, expect } from '@playwright/test';

// The POC requires jumps on both axes, including the final viewport and reversal.
for (const [top, left] of [
  [400_000, 12_000],
  [2_000_000, 60_000],
  [3_996_000, 118_800],
  [4_000_000, 120_000],
  [0, 0],
]) {
  test(`rendered cells match the viewport after jump to ${top}, ${left}`, async ({
    page,
  }) => {
    await page.goto('/');
    const scrollport = page.getByTestId('grid-scrollport');
    // Start away from the target so the zero-position case also exercises a scroll event.
    await scrollport.evaluate((element) => {
      element.scrollTop = 2_000;
      element.scrollLeft = 1_200;
    });
    await expect(page.getByTestId('grid-canvas')).toHaveAttribute(
      'data-rendered-scroll-top',
      '2000',
    );
    await scrollport.evaluate(
      (element, position) => {
        element.scrollTop = position.top;
        element.scrollLeft = position.left;
      },
      { top, left },
    );
    await expect
      .poll(() =>
        scrollport.evaluate((element) => {
          const canvas = element.querySelector('[data-testid="grid-canvas"]');
          return (
            canvas?.getAttribute('data-rendered-scroll-top') ===
              String(element.scrollTop) &&
            canvas?.getAttribute('data-rendered-scroll-left') ===
              String(element.scrollLeft)
          );
        }),
      )
      .toBe(true);
    const result = await scrollport.evaluate((element) => {
      const rowStart = Math.floor(Math.max(0, element.scrollTop - 400) / 40);
      const rowEnd = Math.min(
        100_000,
        Math.ceil((element.scrollTop + element.clientHeight + 400) / 40),
      );
      const columnStart = Math.floor(element.scrollLeft / 120);
      const columnEnd = Math.min(
        996,
        Math.ceil((element.scrollLeft + element.clientWidth - 480) / 120),
      );
      const actual = Array.from(
        element.querySelectorAll('[data-testid="grid-cell"]'),
        (cell) =>
          `${cell.getAttribute('data-row')}:${cell.getAttribute('data-column')}`,
      ).sort();
      const expected: string[] = [];
      for (let row = rowStart; row < rowEnd; row++) {
        for (const column of [0, 1, 998, 999])
          expected.push(`${row}:column-${column}`);
        for (let column = columnStart; column < columnEnd; column++)
          expected.push(`${row}:column-${column + 2}`);
      }
      return { actual, expected: expected.sort() };
    });
    expect(result.actual).toEqual(result.expected);
    expect(result.actual.length).toBeLessThanOrEqual(360);
  });
}

type ScrollableElement = Element & {
  scrollLeft: number;
  scrollTop: number;
};

test('grid has the expected logical size', async ({ page }) => {
  await page.goto('/');

  const gridDebug = page.locator('text=Grid').locator('..');
  const scrollport = page.getByTestId('grid-scrollport');

  await expect(gridDebug).toContainText('"rows": 100000');
  await expect(gridDebug).toContainText('"columns": 1000');
  await expect(scrollport).toHaveCount(1);
  await expect(scrollport).toHaveJSProperty('scrollWidth', 120_000);
  await expect(scrollport).toHaveJSProperty('scrollHeight', 4_000_000);
});

test('uses one scrollport and keeps pinned cells fixed on the horizontal axis', async ({
  page,
}) => {
  await page.goto('/');

  const scrollport = page.getByTestId('grid-scrollport');
  const leftCell = page.locator('[data-row="0"][data-column="column-0"]');
  const rightCell = page.locator('[data-row="0"][data-column="column-999"]');
  const centerCell = page.locator('[data-row="0"][data-column="column-2"]');

  await expect(
    page.locator('[style*="overflow: auto"], [style*="overflow: scroll"]'),
  ).toHaveCount(1);

  const initialLeft = await leftCell.boundingBox();
  const initialCenter = await centerCell.boundingBox();
  const initialRight = await rightCell.boundingBox();

  await scrollport.evaluate((element) => {
    (element as ScrollableElement).scrollLeft = 1_200;
  });

  await expect(scrollport).toHaveJSProperty('scrollLeft', 1_200);
  await expect(
    page.locator('[data-row="0"][data-column="column-12"]'),
  ).toBeVisible();

  const horizontalLeft = await leftCell.boundingBox();
  const horizontalCenter = await page
    .locator('[data-row="0"][data-column="column-12"]')
    .boundingBox();
  const horizontalRight = await rightCell.boundingBox();

  expect(horizontalLeft?.x).toBeCloseTo(initialLeft?.x ?? 0, 0);
  expect(horizontalRight?.x).toBeCloseTo(initialRight?.x ?? 0, 0);
  expect(horizontalCenter?.x).toBeCloseTo(initialCenter?.x ?? 0, 0);
  expect(horizontalCenter?.x).toBeGreaterThan(horizontalLeft?.x ?? 0);
  expect(horizontalCenter?.x).toBeLessThan(horizontalRight?.x ?? 0);
});

test('all three regions stay aligned after vertical scrolling', async ({
  page,
}) => {
  await page.goto('/');

  const scrollport = page.getByTestId('grid-scrollport');

  await scrollport.evaluate((element) => {
    (element as ScrollableElement).scrollLeft = 1_200;
    (element as ScrollableElement).scrollTop = 2_000;
  });

  const leftCell = page.locator('[data-row="50"][data-column="column-0"]');
  const centerCell = page.locator('[data-row="50"][data-column="column-12"]');
  const rightCell = page.locator('[data-row="50"][data-column="column-999"]');

  await expect(leftCell).toBeVisible();
  await expect(centerCell).toBeVisible();
  await expect(rightCell).toBeVisible();

  const [left, center, right] = await Promise.all([
    leftCell.boundingBox(),
    centerCell.boundingBox(),
    rightCell.boundingBox(),
  ]);

  expect(left?.y).toBeCloseTo(center?.y ?? 0, 0);
  expect(center?.y).toBeCloseTo(right?.y ?? 0, 0);
  await expect(page.getByTestId('grid-row')).not.toHaveCount(0);
});
