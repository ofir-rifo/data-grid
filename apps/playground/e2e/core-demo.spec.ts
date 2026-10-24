/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

test('Core demo exposes one table, bounded cells, shared pinned rows and clamped end', async ({
  page,
}) => {
  await page.goto('/?demo=core');
  await expect(
    page.getByRole('table', { name: 'Core virtual table' }),
  ).toHaveAttribute('aria-rowcount', '1001');
  await expect(page.locator('[data-row-id="r0"]')).toHaveCount(1);
  await expect(
    page.locator('[data-row-id="r0"] [data-region="left"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-row-id="r0"] [data-region="right"]'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Million logical rows' }).click();
  const table = page.getByTestId('core-table');
  await expect(table).toHaveAttribute('aria-rowcount', '1000001');
  await expect
    .poll(async () => Number(await table.getAttribute('data-cell-count')))
    .toBeLessThan(1000);
  await page.getByTestId('core-scrollport').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.scrollLeft = element.scrollWidth;
  });
  await expect(table).toHaveAttribute('data-row-end', '1000000');
  await expect(page.locator('[data-row-id="r999999"]')).toHaveCount(1);
  await expect(
    page.locator('[data-row-id="r999999"] [data-column-id="c999"]'),
  ).toHaveCount(1);
  await page.getByLabel('Logical rows').selectOption('0');
  await expect(page.getByRole('cell')).toHaveCount(0);
  await page.getByLabel('Columns', { exact: true }).selectOption('0');
  await expect(page.getByRole('columnheader')).toHaveCount(0);
});
