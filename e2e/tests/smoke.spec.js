import { expect, test } from '@playwright/test';
import { ADMIN_URL, STORE_URL } from '../support/urls.js';

test('store home page loads and shows the header', async ({ page }) => {
  await page.goto(STORE_URL);

  await expect(page).toHaveTitle('Page & Pine');
  const header = page.getByRole('banner');
  await expect(header).toBeVisible();
  await expect(header.getByRole('link', { name: 'Page & Pine home' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    header.getByRole('button', { name: /^Switch to (dark|light) theme$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Books worth keeping, delivered as PDFs.' }),
  ).toBeVisible();
});

test('admin app loads and shows the sidebar', async ({ page }) => {
  await page.goto(ADMIN_URL);

  await expect(page).toHaveURL(/\/books$/);
  await expect(page).toHaveTitle('Books · Seller admin · Page & Pine');
  await expect(page.getByRole('heading', { level: 1, name: 'Books', exact: true })).toBeVisible();

  // Below the lg breakpoint the sidebar is a drawer behind the menu button.
  const menuButton = page.getByRole('button', { name: 'Open navigation' });
  if (await menuButton.isVisible()) await menuButton.click();

  const sidebar = page.getByRole('navigation', { name: 'Admin navigation' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole('link')).toHaveCount(8);
  for (const group of ['Catalog', 'Sales', 'Store']) {
    await expect(
      sidebar.getByRole('heading', { level: 2, name: group, exact: true }),
    ).toBeVisible();
  }
  await expect(sidebar.getByRole('link', { name: 'Books', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
