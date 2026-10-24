import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const css = compileString(
  readFileSync(resolve(import.meta.dirname, 'CoreDemo.module.scss'), 'utf8'),
).css;

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start) + 1);
}

describe('compiled inspection styles (not browser hit-testing/paint evidence)', () => {
  it('keeps the viewport sticky and hit-testable in the native scroll container', () => {
    const table = rule('.table');
    expect(table).toContain('position: sticky');
    expect(table).toContain('inset-block-start: 0');
    expect(table).toContain('inset-inline-start: 0');
    expect(table).toContain('pointer-events: auto');
    expect(rule('.scrollport')).toContain('overflow: auto');
    expect(rule('.cell,\n.header')).not.toContain('pointer-events: none');
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
});
