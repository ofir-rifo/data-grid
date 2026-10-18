/// <reference lib="dom" />
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import VirtualGrid from './VirtualGrid';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('VirtualGrid committed state and lifecycle (jsdom, not browser layout)', () => {
  it.each([
    {
      name: 'default',
      url: '/',
      enabled: 'false',
      nextUrl: '/?flushSync=1',
      nextEnabled: 'true',
    },
    {
      name: 'enabled',
      url: '/?flushSync=1',
      enabled: 'true',
      nextUrl: '/?flushSync=0',
      nextEnabled: 'false',
    },
  ])(
    '$name: latest scroll wins, logical keys persist, and remount resets state',
    ({ url, enabled, nextUrl, nextEnabled }) => {
      window.history.replaceState(null, '', url);
      const view = render(
        <StrictMode>
          <VirtualGrid />
        </StrictMode>,
      );
      const scrollport = view.getByTestId('grid-scrollport');
      const canvas = view.getByTestId('grid-canvas');
      // jsdom has no layout. Inject only the client dimensions the handler reads;
      // native clamping, sticky layout and painted clipping remain browser checks.
      Object.defineProperties(scrollport, {
        clientWidth: { configurable: true, value: 998 },
        clientHeight: { configurable: true, value: 598 },
      });
      expect(canvas.dataset.flushSyncEnabled).toBe(enabled);
      fireEvent.scroll(scrollport, {
        target: { scrollTop: 2_000_003, scrollLeft: 60_001 },
      });

      act(() => {
        fireEvent.scroll(scrollport, {
          target: { scrollTop: 400_000, scrollLeft: 12_000 },
        });
        fireEvent.scroll(scrollport, {
          target: { scrollTop: 2_000_043, scrollLeft: 60_001 },
        });
      });
      expect(canvas.dataset).toMatchObject({
        scrollEventId: '3',
        renderedScrollTop: '2000043',
        renderedScrollLeft: '60001',
        renderedViewportWidth: '998',
        renderedViewportHeight: '598',
        rowStart: '49991',
        rowEnd: '50027',
        columnStart: '500',
        columnEnd: '505',
        renderedRowCount: '36',
        renderedCenterColumnCount: '5',
        renderedCellCount: '324',
      });
      const expected: string[] = [];
      for (let row = 49_991; row < 50_027; row++) {
        for (const column of [0, 1, 502, 503, 504, 505, 506, 998, 999]) {
          expected.push(`${row}:column-${column}`);
        }
      }
      const cells = Array.from(
        canvas.querySelectorAll<HTMLElement>('[data-testid="grid-cell"]'),
      );
      expect(
        cells
          .map((cell) => `${cell.dataset.row}:${cell.dataset.column}`)
          .sort(),
      ).toEqual(expected.sort());
      const center = view.container.querySelector(
        '[data-row="50000"][data-column="column-502"]',
      );
      const pin = view.container.querySelector(
        '[data-row="50000"][data-column="column-0"]',
      );
      expect(center).not.toBeNull();
      expect(pin).not.toBeNull();
      // Reuse applies while the row remains mounted, not across an intermediate
      // jump that correctly removes it (flushSync may commit that intermediate jump).
      fireEvent.scroll(scrollport, {
        target: { scrollTop: 2_000_083, scrollLeft: 60_001 },
      });
      expect(canvas.dataset.scrollEventId).toBe('4');
      expect(canvas.dataset.renderedScrollTop).toBe('2000083');
      expect(
        view.container.querySelector(
          '[data-row="50000"][data-column="column-502"]',
        ),
      ).toBe(center);
      expect(
        view.container.querySelector(
          '[data-row="50000"][data-column="column-0"]',
        ),
      ).toBe(pin);

      // A URL-only rerender keeps the mount-time flag. A fresh mount reads it again.
      window.history.replaceState(null, '', nextUrl);
      view.rerender(
        <StrictMode>
          <VirtualGrid />
        </StrictMode>,
      );
      expect(canvas.dataset.flushSyncEnabled).toBe(enabled);
      view.unmount();
      expect(scrollport.isConnected).toBe(false);
      expect(
        view.container.querySelector('[data-testid="grid-canvas"]'),
      ).toBeNull();
      const detachedState = { ...canvas.dataset };
      fireEvent.scroll(scrollport, { target: { scrollTop: 0, scrollLeft: 0 } });
      expect({ ...canvas.dataset }).toEqual(detachedState);

      const fresh = render(
        <StrictMode>
          <VirtualGrid />
        </StrictMode>,
      );
      expect(fresh.getByTestId('grid-canvas')).not.toBe(canvas);
      expect(fresh.getByTestId('grid-canvas').dataset).toMatchObject({
        flushSyncEnabled: nextEnabled,
        scrollEventId: '0',
        renderedScrollTop: '0',
        renderedScrollLeft: '0',
        rowStart: '0',
        columnStart: '0',
      });
    },
  );
});
