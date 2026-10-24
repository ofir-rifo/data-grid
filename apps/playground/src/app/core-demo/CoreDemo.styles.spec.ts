import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const css = compileString(
  readFileSync(resolve(import.meta.dirname, 'CoreDemo.module.scss'), 'utf8'),
).css;

function rule(selector: string): string {
  const normalize = (value: string) => value.replace(/["']/g, '').trim();
  const blocks = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((match) =>
      match[1]
        .split(',')
        .some((value) => normalize(value) === normalize(selector)),
    )
    .map((match) => match[2]);
  expect(blocks.length).toBeGreaterThan(0);
  return blocks.join('\n');
}

describe('compiled inspection styles (not browser hit-testing/paint evidence)', () => {
  it('casts opposite centerward shadows from transparent clipped edge strips without input or layout changes', () => {
    const left = rule('.region[data-pinned-shadow~=left]::before');
    const right = rule('.region[data-pinned-shadow~=right]::after');
    expect(left).toContain('inset-inline-start: -1px');
    expect(right).toContain('inset-inline-end: -1px');
    expect(left).toContain('var(--core-pinned-shadow-offset, 2px) 0');
    expect(right).toContain(
      'calc(-1 * var(--core-pinned-shadow-offset, 2px)) 0',
    );
    for (const shadow of [left, right]) {
      expect(shadow).toContain('position: absolute');
      expect(shadow).toContain('inset-block: 0');
      expect(shadow).toContain('width: 1px');
      expect(shadow).toContain('z-index: 1');
      expect(shadow).toContain('pointer-events: none');
      expect(shadow).not.toMatch(/\b(?:border|background|padding|margin):/);
    }
    expect(rule('.region')).toContain('overflow: clip');
    expect(rule('.cell')).toContain('border-inline-end: 1px solid transparent');
  });

  it('exposes all inherited shadow components and full-value none overrides without fixing tokens on the grid', () => {
    for (const [side, pseudo] of [
      ['left', 'before'],
      ['right', 'after'],
    ]) {
      const shadow = rule(`.region[data-pinned-shadow~=${side}]::${pseudo}`);
      expect(shadow).toContain(`box-shadow: var(--core-pinned-shadow-${side},`);
      expect(shadow).toContain(
        'var(--core-pinned-shadow-color, var(--core-text, #172337))',
      );
      expect(shadow).toContain('var(--core-pinned-shadow-blur, 6px)');
      expect(shadow).toContain('var(--core-pinned-shadow-spread, 0px)');
      expect(shadow).toContain(
        'opacity: var(--core-pinned-shadow-opacity, 0.18)',
      );
    }
    // Defaults live at use sites: ancestor tokens, including `none` and opacity 0,
    // remain consumer-owned rather than being redeclared on internal elements.
    expect(css).not.toMatch(/--core-pinned-shadow-[\w-]+\s*:/);
  });

  it('vertically centers body and header text without changing horizontal alignment or fixed geometry', () => {
    for (const selector of ['.cell', '.header']) {
      const style = rule(selector);
      expect(style).toContain('display: flex');
      expect(style).toContain('align-items: center');
      expect(style).toContain('box-sizing: border-box');
      expect(style).toContain('padding: 6px 8px');
      expect(style).not.toMatch(
        /justify-content:\s*center|line-height:|transform:/,
      );
    }
  });

  it('keeps the viewport sticky and hit-testable in the native scroll container', () => {
    const table = rule('.table');
    expect(table).toContain('position: sticky');
    expect(table).toContain('inset-block-start: 0');
    expect(table).toContain('inset-inline-start: 0');
    expect(table).toContain('pointer-events: auto');
    expect(rule('.scrollport')).toContain('overflow: auto');
    expect(rule('.cell')).not.toContain('pointer-events: none');
    expect(rule('.header')).not.toContain('pointer-events: none');
  });

  it('draws the themed region separator over children without intercepting input or resizing columns', () => {
    const boundary = rule('.rightBoundary::after');
    expect(boundary).toContain('position: absolute');
    expect(boundary).toContain('inset-inline-start: 0');
    expect(boundary).toContain('inset-block: 0');
    expect(boundary).toContain('width: 1px');
    expect(boundary).toContain('z-index: 1');
    expect(boundary).toContain(
      'var(--core-pinned-separator, var(--core-border, #ccd4df))',
    );
    expect(boundary).toContain('pointer-events: none');
    expect(boundary).not.toMatch(/\b(?:border|padding):/);
    expect(rule('.region')).toContain('overflow: clip');
  });

  it('isolates pinned surfaces and reserves visible vertical rules exclusively for region separators', () => {
    expect(rule('.leftBoundary::after')).toContain('inset-inline-end: 0');
    expect(rule('.leftBoundary::after')).toContain('width: 1px');
    expect(rule('.leftBoundary::after')).toContain('pointer-events: none');
    const region = rule('.region');
    expect(region).toContain('isolation: isolate');
    expect(region).toContain('z-index: 0');
    expect(region).toContain('var(--core-surface, var(--core-cell, #fff))');
    expect(rule('.pinnedRegion')).toContain('z-index: 1');
    expect(rule('.cell')).toContain('border-inline-end: 1px solid transparent');
    expect(rule('.header')).toContain(
      'border-inline-end: 1px solid transparent',
    );
    for (const selector of ['.cell', '.header']) {
      expect(rule(selector)).toContain(
        'border-bottom: 1px solid var(--core-border, #ccd4df)',
      );
      expect(rule(selector)).not.toMatch(
        /border-inline-end-color:|border-right:/,
      );
    }
    expect(rule('.stage')).toContain(
      'border: 1px solid var(--core-border, #8797ad)',
    );
  });
});
