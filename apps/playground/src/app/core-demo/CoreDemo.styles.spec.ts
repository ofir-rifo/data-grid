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

  it('isolates both pinned surfaces and keeps normal internal borders with a color-only edge override', () => {
    expect(rule('.leftBoundary::after')).toContain('inset-inline-end: 0');
    expect(rule('.leftBoundary::after')).toContain('width: 1px');
    expect(rule('.leftBoundary::after')).toContain('pointer-events: none');
    const region = rule('.region');
    expect(region).toContain('isolation: isolate');
    expect(region).toContain('z-index: 0');
    expect(region).toContain('var(--core-surface, var(--core-cell, #fff))');
    expect(rule('.pinnedRegion')).toContain('z-index: 1');
    expect(rule('.cell')).toContain(
      'border-inline-end: 1px solid var(--core-border, #ccd4df)',
    );
    expect(rule('.header')).toContain(
      'border-inline-end: 1px solid var(--core-border, #ccd4df)',
    );
    const suppressed = rule('.cell[data-trailing-border=suppressed]');
    expect(suppressed).toContain('border-inline-end-color: transparent');
    expect(suppressed).not.toMatch(/border(?:-inline-end)?(?:-width)?:/);
  });
});
