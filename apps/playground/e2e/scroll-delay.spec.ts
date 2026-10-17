/// <reference lib="dom" />
import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

interface CommitSample {
  id: number;
  eventAt: number;
  renderAt: number;
  commitAt: number;
  calculationMs: number;
  top: number;
  left: number;
}

interface FrameSample {
  at: number;
  top: number;
  left: number;
  committedTop: number;
  committedLeft: number;
  covered: boolean;
}

interface ScrollTrace {
  commits: CommitSample[];
  events: { at: number; top: number; left: number }[];
  writes: { at: number; top: number; left: number }[];
  frames: FrameSample[];
  stop(): void;
}

declare global {
  interface Window {
    scrollTrace: ScrollTrace;
  }
}

function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: sorted[Math.floor(sorted.length * 0.5)] ?? null,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? null,
    max: sorted.at(-1) ?? null,
  };
}

// Select one mode per controlled run; leave unset for the existing default URL.
const requestedFlushSync = process.env['GRID_FLUSH_SYNC'];
const diagnosticUrl =
  requestedFlushSync === undefined ? '/' : `/?flushSync=${requestedFlushSync}`;

test.afterEach(async ({ page }) => {
  // Also release the observer/listener/rAF when input or assertions fail.
  if (!page.isClosed()) {
    await page.evaluate(() => window.scrollTrace?.stop());
  }
});

for (const input of ['programmatic', 'wheel'] as const) {
  test(`locates scroll delay with ${input} input`, async ({
    page,
  }, testInfo) => {
    // Validate only when this diagnostic runs, not during unrelated test collection.
    if (
      requestedFlushSync !== undefined &&
      requestedFlushSync !== '0' &&
      requestedFlushSync !== '1'
    ) {
      throw new Error('GRID_FLUSH_SYNC must be unset, 0, or 1');
    }
    await page.goto(diagnosticUrl);
    await expect(page.getByTestId('grid-canvas')).toBeVisible();
    await expect(page.getByTestId('grid-canvas')).toHaveAttribute(
      'data-flush-sync-enabled',
      String(requestedFlushSync === '1'),
    );
    await page.evaluate(() => {
      const scrollport = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-scrollport"]',
      );
      const canvas = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-canvas"]',
      );
      if (!scrollport || !canvas) throw new Error('Missing grid');
      const trace: ScrollTrace = {
        commits: [],
        events: [],
        writes: [],
        frames: [],
        stop: () => undefined,
      };
      window.scrollTrace = trace;
      let lastId = 0;
      let stopped = false;
      const recordCommit = () => {
        const id = Number(canvas.dataset.scrollEventId);
        if (id === lastId) return;
        lastId = id;
        trace.commits.push({
          id,
          eventAt: Number(canvas.dataset.lastScrollEventAt),
          renderAt: Number(canvas.dataset.renderStartedAt),
          commitAt: Number(canvas.dataset.reactCommitAt),
          calculationMs: Number(canvas.dataset.windowCalculationMs),
          top: Number(canvas.dataset.renderedScrollTop),
          left: Number(canvas.dataset.renderedScrollLeft),
        });
      };
      const observer = new MutationObserver(recordCommit);
      observer.observe(canvas, {
        attributes: true,
        attributeFilter: ['data-react-commit-at'],
      });
      const onScroll = () =>
        trace.events.push({
          at: performance.now(),
          top: scrollport.scrollTop,
          left: scrollport.scrollLeft,
        });
      scrollport.addEventListener('scroll', onScroll);
      let raf = 0;
      const sample = () => {
        const {
          scrollTop: top,
          scrollLeft: left,
          clientHeight,
          clientWidth,
        } = scrollport;
        trace.frames.push({
          at: performance.now(),
          top,
          left,
          committedTop: Number(canvas.dataset.renderedScrollTop),
          committedLeft: Number(canvas.dataset.renderedScrollLeft),
          covered:
            Number(canvas.dataset.rowStart) <= Math.floor(top / 40) &&
            Number(canvas.dataset.rowEnd) >=
              Math.ceil((top + clientHeight) / 40) &&
            Number(canvas.dataset.columnStart) <= Math.floor(left / 120) &&
            Number(canvas.dataset.columnEnd) >=
              Math.ceil((left + clientWidth - 480) / 120),
        });
        raf = requestAnimationFrame(sample);
      };
      raf = requestAnimationFrame(sample);
      trace.stop = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        // MutationObserver delivery may still be pending at collection shutdown.
        observer.takeRecords();
        recordCommit();
        observer.disconnect();
        scrollport.removeEventListener('scroll', onScroll);
      };
    });

    if (input === 'programmatic') {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            const scrollport = document.querySelector<HTMLDivElement>(
              '[data-testid="grid-scrollport"]',
            );
            if (!scrollport) throw new Error('Missing grid');
            let frame = 0;
            const advance = () => {
              const at = performance.now();
              scrollport.scrollTop += 800;
              window.scrollTrace.writes.push({
                at,
                top: scrollport.scrollTop,
                left: scrollport.scrollLeft,
              });
              if (++frame < 60) requestAnimationFrame(advance);
              else resolve();
            };
            requestAnimationFrame(advance);
          }),
      );
    } else {
      await page.getByTestId('grid-scrollport').hover();
      for (let i = 0; i < 60; i++) await page.mouse.wheel(0, 800);
    }

    await expect
      .poll(() =>
        page.evaluate(() => {
          const scrollport = document.querySelector<HTMLDivElement>(
            '[data-testid="grid-scrollport"]',
          );
          const canvas = document.querySelector<HTMLDivElement>(
            '[data-testid="grid-canvas"]',
          );
          return (
            !!scrollport &&
            !!canvas &&
            scrollport.scrollTop > 0 &&
            Number(canvas.dataset.renderedScrollTop) === scrollport.scrollTop
          );
        }),
      )
      .toBe(true);
    // Allow two frame boundaries after the final commit, without claiming rAF is a paint timestamp.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const trace = await page.evaluate(() => {
      window.scrollTrace.stop();
      const { commits, events, writes, frames } = window.scrollTrace;
      const canvas = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-canvas"]',
      );
      const scrollport = document.querySelector<HTMLDivElement>(
        '[data-testid="grid-scrollport"]',
      );
      if (!canvas || !scrollport) throw new Error('Missing grid');
      return {
        commits,
        events,
        writes,
        frames,
        actualFlushSyncEnabled: canvas.dataset.flushSyncEnabled,
        finalViewport: {
          top: scrollport.scrollTop,
          left: scrollport.scrollLeft,
          committedTop: Number(canvas.dataset.renderedScrollTop),
          committedLeft: Number(canvas.dataset.renderedScrollLeft),
          covered:
            Number(canvas.dataset.rowStart) <=
              Math.floor(scrollport.scrollTop / 40) &&
            Number(canvas.dataset.rowEnd) >=
              Math.ceil((scrollport.scrollTop + scrollport.clientHeight) / 40) &&
            Number(canvas.dataset.columnStart) <=
              Math.floor(scrollport.scrollLeft / 120) &&
            Number(canvas.dataset.columnEnd) >=
              Math.ceil((scrollport.scrollLeft + scrollport.clientWidth - 480) / 120),
        },
        finalDom: {
          rows: canvas.querySelectorAll('[data-testid="grid-row"]').length,
          cells: canvas.querySelectorAll('[data-testid="grid-cell"]').length,
          descendants: canvas.querySelectorAll('*').length,
        },
      };
    });
    const writeToEvent = trace.commits.flatMap((commit) => {
      const write = trace.writes.find(
        (entry) => entry.top === commit.top && entry.left === commit.left,
      );
      return write ? [commit.eventAt - write.at] : [];
    });
    const summary = {
      schemaVersion: 2,
      input,
      browser: testInfo.project.name,
      url: page.url(),
      requestedFlushSync: requestedFlushSync ?? 'absent',
      flushSyncEnabled: trace.actualFlushSyncEnabled === 'true',
      requestedBuildMode:
        process.env['GRID_TEST_PRODUCTION'] === '1' ? 'production' : 'development',
      finalDom: trace.finalDom,
      finalViewport: trace.finalViewport,
      // Callback gaps are observations, not painted/dropped frame counts.
      rafCallbackGapMs: distribution(
        trace.frames
          .slice(1)
          .map((frame, index) => frame.at - trace.frames[index].at),
      ),
      scrollEvents: trace.events.length,
      commits: trace.commits.length,
      frames: trace.frames.length,
      uncoveredRafSamples: trace.frames.filter((frame) => !frame.covered)
        .length,
      writeToHandlerMs: distribution(writeToEvent),
      handlerToRenderMs: distribution(
        trace.commits.map((commit) => commit.renderAt - commit.eventAt),
      ),
      calculationMs: distribution(
        trace.commits.map((commit) => commit.calculationMs),
      ),
      renderToLayoutEffectMs: distribution(
        trace.commits.map((commit) => commit.commitAt - commit.renderAt),
      ),
    };
    const tracePath = testInfo.outputPath('scroll-delay.json');
    await writeFile(tracePath, JSON.stringify({ summary, trace }, null, 2));
    await testInfo.attach('scroll-delay.json', {
      path: tracePath,
      contentType: 'application/json',
    });
    console.log('SCROLL_DELAY', JSON.stringify(summary));
    expect(trace.commits.length).toBeGreaterThan(0);
    expect(trace.actualFlushSyncEnabled).toBe(String(requestedFlushSync === '1'));
    expect(
      trace.commits.every(
        (commit) =>
          Number.isInteger(commit.id) &&
          commit.id > 0 &&
          Number.isFinite(commit.top) &&
          Number.isFinite(commit.left) &&
          Number.isFinite(commit.eventAt) &&
          Number.isFinite(commit.renderAt) &&
          Number.isFinite(commit.commitAt) &&
          Number.isFinite(commit.calculationMs) &&
          commit.calculationMs >= 0 &&
          commit.eventAt <= commit.renderAt &&
          commit.renderAt <= commit.commitAt,
      ),
    ).toBe(true);
    expect(trace.finalViewport.committedTop).toBe(trace.finalViewport.top);
    expect(trace.finalViewport.committedLeft).toBe(trace.finalViewport.left);
    expect(trace.finalViewport.covered).toBe(true);
  });
}
