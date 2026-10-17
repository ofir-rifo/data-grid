import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

interface MeasurementElement {
  clientHeight: number;
  clientWidth: number;
  dataset: Record<string, string | undefined>;
  getAttribute(name: string): string | null;
  scrollLeft: number;
  scrollTop: number;
}

interface MeasurementDocument {
  querySelector<T extends MeasurementElement>(selector: string): T | null;
}

interface MeasurementWindow {
  document: MeasurementDocument;
  performance: { now(): number };
  requestAnimationFrame(callback: (time: number) => void): number;
}

interface BufferSetting {
  rowBuffer: number;
  columnBuffer: number;
  axis: 'horizontal' | 'vertical';
  step: number;
  frames: number;
}

interface FrameSample {
  frame: number;
  frameTimestampMs: number;
  frameGapMs: number | null;
  scrollTop: number;
  scrollLeft: number;
  rowStart: number;
  rowEnd: number;
  renderedRowCount: number;
  viewportRowStart: number;
  viewportRowEnd: number;
  rowsCovered: boolean;
  columnStart: number;
  columnEnd: number;
  viewportColumnStart: number;
  viewportColumnEnd: number;
  columnsCovered: boolean;
  viewportFullyCovered: boolean;
  reactCommittedScrollTop: number;
  reactCommittedScrollLeft: number;
  reactScrollEventId: number;
  scrollEventToCommitMs: number;
  scrollEventAtMs: number;
  reactCommitAtMs: number;
  scrollPositionToCommitMs: number | null;
  reactCommitLagFrames: number | null;
  reactCommitCurrent: boolean;
  renderWindowMatchesCommittedPosition: boolean;
  expectedCommittedRowStart: number;
  expectedCommittedRowEnd: number;
  expectedCommittedColumnStart: number;
  expectedCommittedColumnEnd: number;
}

const settings: BufferSetting[] = [
  { rowBuffer: 400, columnBuffer: 0, axis: 'vertical', step: 200, frames: 60 },
  { rowBuffer: 400, columnBuffer: 0, axis: 'vertical', step: 400, frames: 60 },
  { rowBuffer: 400, columnBuffer: 0, axis: 'vertical', step: 800, frames: 60 },
];

test.use({ video: 'on' });

test.describe('virtualization scroll timing experiment', () => {
  for (const setting of settings) {
    test(`${setting.axis}: step=${setting.step}px/frame, rowBuffer=${setting.rowBuffer}px`, async ({
      page,
    }) => {
      await page.goto(
        `/?rowBuffer=${setting.rowBuffer}&columnBuffer=${setting.columnBuffer}`,
      );

      const canvas = page.getByTestId('grid-canvas');
      await canvas.waitFor();

      const frameSamples = await page.evaluate<FrameSample[], BufferSetting>(
        ({ axis, step, frames, rowBuffer, columnBuffer }) => {
          const browser = globalThis as unknown as MeasurementWindow;
          const scrollElement =
            browser.document.querySelector<MeasurementElement>(
              '[data-testid="grid-scrollport"]',
            );
          const renderElement =
            browser.document.querySelector<MeasurementElement>(
              '[data-testid="grid-canvas"]',
            );

          if (scrollElement === null || renderElement === null) {
            throw new Error('Virtual grid measurement elements were not found');
          }

          let frame = 0;
          let previousFrameAt: number | null = null;
          const samples: FrameSample[] = [];
          const nativePositionChangedAt = new Map<
            string,
            { changedAt: number; frame: number }
          >();

          return new Promise<FrameSample[]>((resolve) => {
            const sampleFrame = (frameAt: number) => {
              frame++;
              const frameGapMs =
                previousFrameAt === null ? null : frameAt - previousFrameAt;
              previousFrameAt = frameAt;

              const targetOffset = frame * step;
              if (axis === 'horizontal') {
                scrollElement.scrollLeft = targetOffset;
              } else {
                scrollElement.scrollTop = targetOffset;
              }

              const scrollTop = scrollElement.scrollTop;
              const scrollLeft = scrollElement.scrollLeft;
              const changedAt = browser.performance.now();
              nativePositionChangedAt.set(`${scrollTop}:${scrollLeft}`, {
                changedAt,
                frame,
              });

              const viewportRowStart = Math.floor(scrollTop / 40);
              const viewportRowEnd = Math.ceil(
                (scrollTop + scrollElement.clientHeight) / 40,
              );
              const viewportColumnStart = Math.floor(scrollLeft / 120);
              const centerViewportWidth = scrollElement.clientWidth - 4 * 120;
              const viewportColumnEnd = Math.ceil(
                (scrollLeft + centerViewportWidth) / 120,
              );

              const rowStart = Number(
                renderElement.getAttribute('data-row-start'),
              );
              const rowEnd = Number(renderElement.getAttribute('data-row-end'));
              const renderedRowCount = Number(
                renderElement.getAttribute('data-rendered-row-count'),
              );
              const columnStart = Number(
                renderElement.getAttribute('data-column-start'),
              );
              const columnEnd = Number(
                renderElement.getAttribute('data-column-end'),
              );
              const reactCommittedScrollTop = Number(
                renderElement.dataset.renderedScrollTop ?? 0,
              );
              const reactCommittedScrollLeft = Number(
                renderElement.dataset.renderedScrollLeft ?? 0,
              );
              const committedViewportWidth = Number(
                renderElement.dataset.renderedViewportWidth ?? 1_000,
              );
              const committedViewportHeight = Number(
                renderElement.dataset.renderedViewportHeight ?? 600,
              );
              const committedCenterWidth = committedViewportWidth - 4 * 120;
              const reactCommitAt = Number(
                renderElement.dataset.reactCommitAt ?? 0,
              );
              const committedPositionChange = nativePositionChangedAt.get(
                `${reactCommittedScrollTop}:${reactCommittedScrollLeft}`,
              );
              const rowsCovered =
                rowStart <= viewportRowStart && rowEnd >= viewportRowEnd;
              const columnsCovered =
                columnStart <= viewportColumnStart &&
                columnEnd >= viewportColumnEnd;
              const expectedCommittedRowStart = Math.floor(
                Math.max(0, reactCommittedScrollTop - rowBuffer) / 40,
              );
              const expectedCommittedRowEnd = Math.min(
                100_000,
                Math.ceil(
                  (reactCommittedScrollTop +
                    committedViewportHeight +
                    rowBuffer) /
                    40,
                ),
              );
              const expectedCommittedColumnStart = Math.floor(
                Math.max(0, reactCommittedScrollLeft - columnBuffer) / 120,
              );
              const expectedCommittedColumnEnd = Math.min(
                996,
                Math.ceil(
                  (reactCommittedScrollLeft +
                    committedCenterWidth +
                    columnBuffer) /
                    120,
                ),
              );

              samples.push({
                frame,
                frameTimestampMs: Number(frameAt.toFixed(2)),
                frameGapMs:
                  frameGapMs === null ? null : Number(frameGapMs.toFixed(2)),
                scrollTop,
                scrollLeft,
                rowStart,
                rowEnd,
                renderedRowCount,
                viewportRowStart,
                viewportRowEnd,
                rowsCovered,
                columnStart,
                columnEnd,
                viewportColumnStart,
                viewportColumnEnd,
                columnsCovered,
                viewportFullyCovered: rowsCovered && columnsCovered,
                reactCommittedScrollTop,
                reactCommittedScrollLeft,
                reactScrollEventId: Number(
                  renderElement.dataset.scrollEventId ?? 0,
                ),
                scrollEventToCommitMs: Number(
                  renderElement.dataset.scrollToRenderMs ?? 0,
                ),
                scrollEventAtMs: Number(
                  renderElement.dataset.lastScrollEventAt ?? 0,
                ),
                reactCommitAtMs: reactCommitAt,
                scrollPositionToCommitMs:
                  committedPositionChange === undefined || reactCommitAt === 0
                    ? null
                    : Number(
                        (
                          reactCommitAt - committedPositionChange.changedAt
                        ).toFixed(2),
                      ),
                reactCommitLagFrames:
                  committedPositionChange === undefined
                    ? null
                    : frame - committedPositionChange.frame,
                reactCommitCurrent:
                  reactCommittedScrollTop === scrollTop &&
                  reactCommittedScrollLeft === scrollLeft,
                renderWindowMatchesCommittedPosition:
                  rowStart === expectedCommittedRowStart &&
                  rowEnd === expectedCommittedRowEnd &&
                  columnStart === expectedCommittedColumnStart &&
                  columnEnd === expectedCommittedColumnEnd,
                expectedCommittedRowStart,
                expectedCommittedRowEnd,
                expectedCommittedColumnStart,
                expectedCommittedColumnEnd,
              });

              if (frame < frames) {
                browser.requestAnimationFrame(sampleFrame);
              } else {
                resolve(samples);
              }
            };

            browser.requestAnimationFrame(sampleFrame);
          });
        },
        setting,
      );

      await page.waitForFunction(() => {
        const browser = globalThis as unknown as MeasurementWindow;
        const scrollElement =
          browser.document.querySelector<MeasurementElement>(
            '[data-testid="grid-scrollport"]',
          );
        const renderElement =
          browser.document.querySelector<MeasurementElement>(
            '[data-testid="grid-canvas"]',
          );

        return (
          scrollElement !== null &&
          renderElement !== null &&
          renderElement.dataset.renderedScrollTop ===
            String(scrollElement.scrollTop) &&
          renderElement.dataset.renderedScrollLeft ===
            String(scrollElement.scrollLeft)
        );
      });

      const coverageMisses = frameSamples.filter(
        (sample) => !sample.viewportFullyCovered,
      ).length;
      const staleReactFrames = frameSamples.filter(
        (sample) => !sample.reactCommitCurrent,
      ).length;
      const renderCalculationMismatches = frameSamples.filter(
        (sample) => !sample.renderWindowMatchesCommittedPosition,
      ).length;
      const commitLatencies = frameSamples
        .map((sample) => sample.scrollPositionToCommitMs)
        .filter((latency): latency is number => latency !== null);
      const commitLagFrames = frameSamples
        .map((sample) => sample.reactCommitLagFrames)
        .filter((lag): lag is number => lag !== null);
      const commitSamples = new Set(
        frameSamples.map((sample) => sample.reactScrollEventId),
      ).size;
      const summary = {
        ...setting,
        sampledFrames: frameSamples.length,
        coverageMisses,
        staleReactFrames,
        renderCalculationMismatches,
        commitsObserved: commitSamples,
        measuredCommitLatencies: commitLatencies.length,
        maxReactCommitLagFrames:
          commitLagFrames.length === 0 ? null : Math.max(...commitLagFrames),
        maxBrowserToReactScrollTopDifference: Math.max(
          ...frameSamples.map((sample) =>
            Math.abs(sample.scrollTop - sample.reactCommittedScrollTop),
          ),
        ),
        renderedRowCountMin: Math.min(
          ...frameSamples.map((sample) => sample.renderedRowCount),
        ),
        renderedRowCountMax: Math.max(
          ...frameSamples.map((sample) => sample.renderedRowCount),
        ),
        renderWindowCorrectForCommittedPosition:
          renderCalculationMismatches === 0,
        maxFrameGapMs: Math.max(
          ...frameSamples.map((sample) => sample.frameGapMs ?? 0),
        ),
        minScrollPositionToCommitMs:
          commitLatencies.length === 0 ? null : Math.min(...commitLatencies),
        maxScrollPositionToCommitMs:
          commitLatencies.length === 0 ? null : Math.max(...commitLatencies),
        maxScrollEventToCommitMs: Math.max(
          ...frameSamples.map((sample) => sample.scrollEventToCommitMs),
        ),
      };

      const samplePath = test.info().outputPath('frame-samples.json');
      await writeFile(
        samplePath,
        JSON.stringify({ summary, frameSamples }, null, 2),
        'utf8',
      );

      console.log('SCROLL_TIMING_EXPERIMENT', JSON.stringify(summary));
      console.log('SCROLL_TIMING_SAMPLES', samplePath);
      expect(renderCalculationMismatches).toBe(0);
      expect(frameSamples).toHaveLength(setting.frames);
    });
  }
});
