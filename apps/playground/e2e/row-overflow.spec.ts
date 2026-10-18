/// <reference lib="dom" />
import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function captureLayout(
  page: Page,
  label: string,
  position?: { top: number; left: number },
) {
  return page.evaluate(
    ({ label, position }) => {
      const scrollport = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-scrollport"]',
      );
      const canvas = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-canvas"]',
      );
      if (!scrollport || !canvas) throw new Error('Missing grid');
      const beforeAssignment = {
        scrollHeight: scrollport.scrollHeight,
        clientHeight: scrollport.clientHeight,
        maxTop: scrollport.scrollHeight - scrollport.clientHeight,
        scrollWidth: scrollport.scrollWidth,
        clientWidth: scrollport.clientWidth,
        maxLeft: scrollport.scrollWidth - scrollport.clientWidth,
      };
      if (position) {
        scrollport.scrollTop = position.top;
        scrollport.scrollLeft = position.left;
      }
      const viewport = scrollport.getBoundingClientRect();
      const originTop = viewport.top + scrollport.clientTop;
      const originLeft = viewport.left + scrollport.clientLeft;
      const bounds = (rect: DOMRect) => ({
        top: rect.top - originTop + scrollport.scrollTop,
        bottom: rect.bottom - originTop + scrollport.scrollTop,
        left: rect.left - originLeft + scrollport.scrollLeft,
        right: rect.right - originLeft + scrollport.scrollLeft,
        width: rect.width,
        height: rect.height,
      });
      const rows = canvas.querySelectorAll<HTMLElement>(
        '[data-testid="grid-row"]',
      );
      const lastRow = rows.item(rows.length - 1);
      if (!lastRow) throw new Error('Missing rendered rows');
      const cells = Array.from(
        lastRow.querySelectorAll<HTMLElement>('[data-testid="grid-cell"]'),
        (cell) => {
          const style = getComputedStyle(cell);
          const range = document.createRange();
          range.selectNodeContents(cell);
          return {
            column: cell.dataset.column,
            region: cell.dataset.region,
            text: cell.textContent,
            ariaHidden: cell.getAttribute('aria-hidden'),
            box: bounds(cell.getBoundingClientRect()),
            textBounds: bounds(range.getBoundingClientRect()),
            textRects: Array.from(range.getClientRects(), bounds),
            clientHeight: cell.clientHeight,
            scrollHeight: cell.scrollHeight,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            whiteSpace: style.whiteSpace,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            borderBottom: style.borderBottomWidth,
            boxSizing: style.boxSizing,
          };
        },
      );
      return {
        label,
        beforeAssignment,
        flag: canvas.dataset.flushSyncEnabled,
        scrollTop: scrollport.scrollTop,
        scrollLeft: scrollport.scrollLeft,
        scrollHeight: scrollport.scrollHeight,
        scrollWidth: scrollport.scrollWidth,
        clientHeight: scrollport.clientHeight,
        clientWidth: scrollport.clientWidth,
        maxTop: scrollport.scrollHeight - scrollport.clientHeight,
        maxLeft: scrollport.scrollWidth - scrollport.clientWidth,
        committedTop: Number(canvas.dataset.renderedScrollTop),
        committedLeft: Number(canvas.dataset.renderedScrollLeft),
        rowStart: canvas.dataset.rowStart,
        rowEnd: canvas.dataset.rowEnd,
        logicalFinalRowMounted:
          canvas.querySelector('[data-testid="grid-row"][data-row="99999"]') !==
          null,
        canvas: bounds(canvas.getBoundingClientRect()),
        lastRenderedRow: lastRow.dataset.row,
        rowBox: bounds(lastRow.getBoundingClientRect()),
        cells,
      };
    },
    { label, position },
  );
}

for (const mode of [
  { name: 'default', url: '/', enabled: 'false' },
  { name: 'enabled', url: '/?flushSync=1', enabled: 'true' },
] as const) {
  test(`contains final-row overflow in ${mode.name} mode`, async ({
    page,
  }, testInfo) => {
    await page.goto(mode.url);
    await expect(page.getByTestId('grid-canvas')).toHaveAttribute(
      'data-flush-sync-enabled',
      mode.enabled,
    );
    await page.getByTestId('grid-scrollport').evaluate((element) => {
      element.scrollTop = 2_000_000;
      element.scrollLeft = 60_000;
    });
    await expect(page.getByTestId('grid-canvas')).toHaveAttribute(
      'data-rendered-scroll-top',
      '2000000',
    );
    const middle = await captureLayout(page, 'middle-committed');
    const assigned = await captureLayout(
      page,
      'bottom-assigned-before-commit',
      {
        top: 4_000_000,
        left: 120_000,
      },
    );
    await expect(
      page.locator('[data-testid="grid-row"][data-row="99999"]'),
    ).toHaveCount(1);
    await expect
      .poll(() =>
        page.getByTestId('grid-scrollport').evaluate((element) => {
          const canvas = element.querySelector<HTMLElement>(
            '[data-testid="grid-canvas"]',
          );
          return (
            canvas?.dataset.renderedScrollTop === String(element.scrollTop) &&
            canvas?.dataset.renderedScrollLeft === String(element.scrollLeft)
          );
        }),
      )
      .toBe(true);
    const mounted = await captureLayout(page, 'bottom-final-row-committed');
    const evidence = {
      browser: testInfo.project.name,
      url: page.url(),
      middle,
      assigned,
      mounted,
      scrollHeightDelta:
        mounted.scrollHeight - assigned.beforeAssignment.scrollHeight,
      maxTopDelta: mounted.maxTop - assigned.beforeAssignment.maxTop,
      clientHeightDelta:
        mounted.clientHeight - assigned.beforeAssignment.clientHeight,
    };
    const path = testInfo.outputPath('row-overflow.json');
    await writeFile(path, JSON.stringify(evidence, null, 2));
    await testInfo.attach('row-overflow.json', {
      path,
      contentType: 'application/json',
    });
    console.log('ROW_OVERFLOW', JSON.stringify(evidence));
    expect(middle.logicalFinalRowMounted).toBe(false);
    expect(mounted.logicalFinalRowMounted).toBe(true);
    expect(mounted.committedTop).toBe(mounted.scrollTop);
    expect(mounted.committedLeft).toBe(mounted.scrollLeft);
    expect(new Set(mounted.cells.map((cell) => cell.region))).toEqual(
      new Set(['left', 'center', 'right']),
    );
    expect(mounted.cells.length).toBeGreaterThan(0);
    for (const snapshot of [middle, assigned, mounted]) {
      expect(snapshot.flag).toBe(mode.enabled);
      expect(snapshot.scrollHeight).toBe(snapshot.canvas.height);
      expect(snapshot.scrollWidth).toBe(snapshot.canvas.width);
    }
    expect(evidence.scrollHeightDelta).toBe(0);
    expect(evidence.maxTopDelta).toBe(0);
    expect(mounted.maxLeft).toBe(assigned.beforeAssignment.maxLeft);
    expect(mounted.rowBox.bottom).toBe(mounted.canvas.bottom);
    expect(mounted.rowBox.height).toBe(40);
    for (const cell of mounted.cells) {
      expect(cell.box.height).toBe(40);
      expect(cell.box.width).toBe(120);
      expect(cell.box.bottom).toBe(mounted.canvas.bottom);
      expect(cell.overflowX).toBe('clip');
      expect(cell.overflowY).toBe('clip');
      expect(cell.whiteSpace).toBe('normal');
      expect(cell.paddingTop).toBe('8px');
      expect(cell.paddingBottom).toBe('8px');
      expect(cell.borderBottom).toBe('1px');
      expect(cell.text?.trim()).toBe(`R99999 C${cell.column}`);
      expect(cell.ariaHidden).toBeNull();
    }
    // Text ranges can still extend beyond the box: clipping contains paint and
    // scroll propagation, not the underlying text or its layout rectangles.
  });
}
