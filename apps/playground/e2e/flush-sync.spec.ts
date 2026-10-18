/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';

const modes = [
  { name: 'absent', url: '/', enabled: 'false' },
  { name: 'enabled', url: '/?flushSync=1', enabled: 'true' },
  { name: 'disabled', url: '/?flushSync=0', enabled: 'false' },
] as const;

async function checkJump(
  page: Page,
  position: {
    top: number;
    left: number;
    via?: { top: number; left: number }[];
  },
  enabled: string,
) {
  const scrollport = page.getByTestId('grid-scrollport');
  const canvas = page.getByTestId('grid-canvas');
  await expect(canvas).toHaveAttribute('data-scroll-event-id', /^\d+$/);
  const previousId = Number(await canvas.getAttribute('data-scroll-event-id'));

  const appliedPosition = await scrollport.evaluate((element, target) => {
    // Clamp against the layout at assignment time. Rendering destination rows
    // can change scrollable overflow, so a later maximum is a different oracle.
    const maxTop = element.scrollHeight - element.clientHeight;
    const maxLeft = element.scrollWidth - element.clientWidth;
    for (const intermediate of target.via ?? []) {
      element.scrollTop = intermediate.top;
      element.scrollLeft = intermediate.left;
    }
    element.scrollTop = target.top;
    element.scrollLeft = target.left;
    return {
      top: element.scrollTop,
      left: element.scrollLeft,
      maxTop,
      maxLeft,
    };
  }, position);
  expect(appliedPosition.top).toBe(
    Math.min(Math.max(0, position.top), appliedPosition.maxTop),
  );
  expect(appliedPosition.left).toBe(
    Math.min(Math.max(0, position.left), appliedPosition.maxLeft),
  );

  // Wait for committed state, not an arbitrary delay or a timing threshold.
  await expect
    .poll(() =>
      scrollport.evaluate((element) => {
        const grid = element.querySelector<HTMLElement>(
          '[data-testid="grid-canvas"]',
        );
        return (
          grid?.dataset.renderedScrollTop === String(element.scrollTop) &&
          grid?.dataset.renderedScrollLeft === String(element.scrollLeft)
        );
      }),
    )
    .toBe(true);

  const sample = await scrollport.evaluate((element) => {
    const grid = element.querySelector<HTMLElement>(
      '[data-testid="grid-canvas"]',
    );
    if (!grid) throw new Error('Missing grid canvas');
    const { scrollTop, scrollLeft, clientWidth, clientHeight } = element;
    // Independent fixed-geometry oracle for the POC's default buffers.
    const rowStart = Math.floor(Math.max(0, scrollTop - 400) / 40);
    const rowEnd = Math.min(
      100_000,
      Math.ceil((scrollTop + clientHeight + 400) / 40),
    );
    const columnStart = Math.floor(scrollLeft / 120);
    const columnEnd = Math.min(
      996,
      Math.ceil((scrollLeft + clientWidth - 480) / 120),
    );
    const expectedCells: string[] = [];
    for (let row = rowStart; row < rowEnd; row++) {
      for (const column of [0, 1, 998, 999]) {
        expectedCells.push(`${row}:column-${column}`);
      }
      for (let column = columnStart; column < columnEnd; column++) {
        expectedCells.push(`${row}:column-${column + 2}`);
      }
    }
    const actualCells = Array.from(
      grid.querySelectorAll<HTMLElement>('[data-testid="grid-cell"]'),
      (cell) => `${cell.dataset.row}:${cell.dataset.column}`,
    ).sort();
    const visibleRow = Math.floor(scrollTop / 40);
    const cellRect = (column: number) => {
      const cell = grid.querySelector<HTMLElement>(
        `[data-row="${visibleRow}"][data-column="column-${column}"]`,
      );
      if (!cell)
        throw new Error(`Missing visible cell ${visibleRow}:${column}`);
      const rect = cell.getBoundingClientRect();
      return { x: rect.x, y: rect.y, height: rect.height };
    };
    const viewportLeft =
      element.getBoundingClientRect().left + element.clientLeft;
    return {
      data: { ...grid.dataset },
      scrollTop,
      scrollLeft,
      clientWidth,
      clientHeight,
      rowStart,
      rowEnd,
      columnStart,
      columnEnd,
      rowCount: grid.querySelectorAll('[data-testid="grid-row"]').length,
      elementDescendants: grid.querySelectorAll('*').length,
      actualCells,
      expectedCells: expectedCells.sort(),
      pins: [0, 1, 998, 999].map(cellRect),
      center: cellRect(columnStart + 2),
      expectedPinX: [
        viewportLeft,
        viewportLeft + 120,
        viewportLeft + clientWidth - 240,
        viewportLeft + clientWidth - 120,
      ],
    };
  });

  expect(sample.scrollTop).toBe(appliedPosition.top);
  expect(sample.scrollLeft).toBe(appliedPosition.left);
  expect(sample.actualCells).toEqual(sample.expectedCells);
  expect(sample.actualCells.length).toBeLessThanOrEqual(360);
  expect(sample.rowCount).toBe(sample.rowEnd - sample.rowStart);
  // One row + one center wrapper + its cells, at this settled checkpoint.
  // This is an element-count assertion, not a peak DOM or memory measurement.
  expect(sample.elementDescendants).toBe(
    sample.rowCount * (2 + 4 + sample.columnEnd - sample.columnStart),
  );
  expect(sample.elementDescendants).toBeLessThanOrEqual(432);
  expect(sample.data).toMatchObject({
    flushSyncEnabled: enabled,
    rowBuffer: '400',
    columnBuffer: '0',
    rowStart: String(sample.rowStart),
    rowEnd: String(sample.rowEnd),
    columnStart: String(sample.columnStart),
    columnEnd: String(sample.columnEnd),
    renderedRowCount: String(sample.rowCount),
    renderedCenterColumnCount: String(sample.columnEnd - sample.columnStart),
    renderedCellCount: String(sample.actualCells.length),
    renderedScrollTop: String(sample.scrollTop),
    renderedScrollLeft: String(sample.scrollLeft),
    renderedViewportWidth: String(sample.clientWidth),
    renderedViewportHeight: String(sample.clientHeight),
  });
  expect(Number(sample.data.scrollEventId)).toBeGreaterThan(previousId);
  const eventAt = Number(sample.data.lastScrollEventAt);
  const renderAt = Number(sample.data.renderStartedAt);
  const commitAt = Number(sample.data.reactCommitAt);
  expect(Number.isFinite(eventAt)).toBe(true);
  expect(Number.isFinite(renderAt)).toBe(true);
  expect(Number.isFinite(commitAt)).toBe(true);
  expect(eventAt).toBeGreaterThan(0);
  expect(renderAt).toBeGreaterThanOrEqual(eventAt);
  expect(commitAt).toBeGreaterThanOrEqual(renderAt);
  expect(Number(sample.data.windowCalculationMs)).toBeGreaterThanOrEqual(0);
  expect(Number(sample.data.eventToRenderStartMs)).toBe(renderAt - eventAt);
  expect(Number(sample.data.renderStartToCommitMs)).toBe(commitAt - renderAt);
  expect(sample.data.scrollToRenderMs).toBe((commitAt - eventAt).toFixed(2));

  for (const [index, pin] of sample.pins.entries()) {
    // Pixel geometry tolerance, not a machine-dependent performance limit.
    expect(pin.x).toBeCloseTo(sample.expectedPinX[index], 0);
    expect(pin.y).toBeCloseTo(sample.center.y, 0);
    expect(pin.height).toBe(40);
  }
}

test.describe('flushSync POC regression', () => {
  test('navigation reinitializes the flag when enabling, disabling, and removing it', async ({
    page,
  }) => {
    for (const mode of [modes[1], modes[2], modes[0]]) {
      await page.goto(mode.url);
      await expect(page.getByTestId('grid-canvas')).toHaveAttribute(
        'data-flush-sync-enabled',
        mode.enabled,
      );
    }
  });

  for (const mode of modes) {
    test(`${mode.name}: flag, final coverage, diagnostics, and pinned alignment`, async ({
      page,
    }) => {
      await page.goto(mode.url);
      const canvas = page.getByTestId('grid-canvas');
      await expect(canvas).toHaveAttribute(
        'data-flush-sync-enabled',
        mode.enabled,
      );
      await page.reload();
      await expect(canvas).toHaveAttribute(
        'data-flush-sync-enabled',
        mode.enabled,
      );
      await expect(page.getByTestId('grid-scrollport')).toHaveCount(1);

      for (const position of [
        { top: 40, left: 0 }, // Small vertical movement.
        { top: 40, left: 120 }, // Small horizontal movement.
        { top: 400_000, left: 0 }, // Vertical large jump.
        { top: 400_000, left: 12_000 }, // Horizontal large jump.
        { top: 2_000_000, left: 60_000 }, // Both axes.
        { top: 4_000_000, left: 120_000 }, // Native bottom/right clamping.
        { top: -400, left: -1_200 }, // Reverse beyond origin: native clamping to zero.
      ]) {
        await checkJump(page, position, mode.enabled);
      }
      // Multiple writes in one browser task; assert only the final settled state,
      // not a one-event-per-write assumption or a displayed-frame guarantee.
      await checkJump(
        page,
        {
          top: 80,
          left: 240,
          via: [
            { top: 400_000, left: 12_000 },
            { top: 2_000_000, left: 60_000 },
          ],
        },
        mode.enabled,
      );
      // Final-state correctness does not prove absence of transient painted blanks.
    });
  }
});
