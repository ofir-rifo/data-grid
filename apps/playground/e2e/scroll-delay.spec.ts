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

for (const input of ['programmatic', 'wheel'] as const) {
  test(`locates scroll delay with ${input} input`, async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await expect(page.getByTestId('grid-canvas')).toBeVisible();
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
      const observer = new MutationObserver(() => {
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
      });
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
        cancelAnimationFrame(raf);
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
              scrollport.scrollTop += 800;
              window.scrollTrace.writes.push({
                at: performance.now(),
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
      return { commits, events, writes, frames };
    });
    const writeToEvent = trace.commits.flatMap((commit) => {
      const write = trace.writes.find(
        (entry) => entry.top === commit.top && entry.left === commit.left,
      );
      return write ? [commit.eventAt - write.at] : [];
    });
    const summary = {
      input,
      browser: testInfo.project.name,
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
    expect(
      trace.commits.every(
        (commit) =>
          commit.eventAt <= commit.renderAt &&
          commit.renderAt <= commit.commitAt,
      ),
    ).toBe(true);
    expect(trace.frames.at(-1)?.covered).toBe(true);
  });
}
