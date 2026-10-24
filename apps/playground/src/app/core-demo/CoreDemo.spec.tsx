/// <reference lib="dom" />
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoreDemo from './CoreDemo';

const observers = new Set<ResizeObserverMock>();
class ResizeObserverMock implements ResizeObserver {
  private readonly targets = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    observers.add(this);
  }
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
    observers.delete(this);
  }
  notify(): void {
    if (this.targets.size > 0) this.callback([], this);
  }
}

beforeEach(() => vi.stubGlobal('ResizeObserver', ResizeObserverMock));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  observers.clear();
});

function measure(scrollport: HTMLElement, width: number, height: number): void {
  // jsdom has no layout. These are deterministic adapter inputs, not browser evidence.
  Object.defineProperties(scrollport, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  });
  act(() => {
    for (const observer of observers) observer.notify();
  });
}

describe('CoreDemo adapter (bounded jsdom unit tests)', () => {
  it('keeps targetable cell event paths inside the accessible native scrollport', () => {
    const view = render(<CoreDemo />);
    const scrollport = view.getByTestId('core-scrollport');
    measure(scrollport, 300, 96);
    const table = view.getByRole('table');
    expect(table.closest('[data-testid="core-scrollport"]')).toBe(scrollport);
    expect(table.closest('[aria-hidden="true"]')).toBeNull();
    expect(view.getByTestId('core-canvas').contains(table)).toBe(true);
    const cell = view.getAllByRole('cell')[0];
    let wheelTarget: EventTarget | null = null;
    scrollport.addEventListener(
      'wheel',
      (event) => {
        wheelTarget = event.target;
      },
      { once: true },
    );
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 32,
    });
    fireEvent(cell, wheel);
    expect(wheelTarget).toBe(cell);
    expect(wheel.defaultPrevented).toBe(false);
    let clickTarget: EventTarget | null = null;
    scrollport.addEventListener(
      'click',
      (event) => {
        clickTarget = event.target;
      },
      { once: true },
    );
    fireEvent.click(cell);
    expect(clickTarget).toBe(cell);
  });

  it('keeps scroll diagnostics out of live status and enforces its LTR coordinate contract', () => {
    const view = render(
      <div dir="rtl">
        <CoreDemo />
      </div>,
    );
    const scrollport = view.getByTestId('core-scrollport');
    expect(scrollport.closest('[dir="ltr"]')).not.toBeNull();
    expect(view.queryByRole('status')).toBeNull();
    expect(view.getByTestId('core-debug').tagName).toBe('DIV');
    measure(scrollport, 300, 96);
    fireEvent.scroll(scrollport, {
      target: { scrollTop: 64, scrollLeft: 100 },
    });
    expect(view.queryByRole('status')).toBeNull();
    expect(view.getByTestId('core-debug').textContent).toContain(
      'Logical scroll: 100.0, 64.0',
    );
  });

  it('maps the lazy preset to the final row and resets state on count/column changes', () => {
    const view = render(<CoreDemo />);
    const scrollport = view.getByTestId('core-scrollport');
    measure(scrollport, 300, 96);
    fireEvent.click(view.getByRole('button', { name: 'Million logical rows' }));
    const table = view.getByTestId('core-table');
    expect(table.getAttribute('aria-rowcount')).toBe('1000001');
    expect(Number(table.getAttribute('data-cell-count'))).toBeLessThan(100);
    fireEvent.scroll(scrollport, {
      target: { scrollTop: 1_000_000 - 64, scrollLeft: 1e9 },
    });
    expect(table.getAttribute('data-row-end')).toBe('1000000');
    expect(table.querySelector('[data-row-id="r999999"]')).not.toBeNull();
    fireEvent.change(view.getByLabelText('Logical rows'), {
      target: { value: '1' },
    });
    expect(table.getAttribute('aria-rowcount')).toBe('2');
    expect(table.getAttribute('data-row-start')).toBe('0');
    expect(scrollport.scrollTop).toBe(0);
    expect(scrollport.scrollLeft).toBe(0);
    fireEvent.change(view.getByLabelText('Columns'), {
      target: { value: '0' },
    });
    expect(view.queryByRole('table')).toBeNull();
    expect(
      view.getByText('No cells: select nonzero rows and columns.'),
    ).not.toBeNull();
  });

  it('suppresses empty semantics before measurement and releases observers in StrictMode', () => {
    const view = render(
      <StrictMode>
        <CoreDemo />
      </StrictMode>,
    );
    const scrollport = view.getByTestId('core-scrollport');
    expect(view.queryByRole('table')).toBeNull();
    measure(scrollport, 300, 96);
    expect(view.getByRole('table')).not.toBeNull();
    measure(scrollport, 0, 96);
    expect(view.queryByRole('row')).toBeNull();
    expect(observers.size).toBe(1);
    view.unmount();
    expect(observers.size).toBe(0);
  });
});
