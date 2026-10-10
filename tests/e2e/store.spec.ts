import { test, expect, type Page } from '@playwright/test';
async function ready(page: Page) {
  await expect(page.getByRole('link', { name: 'Cart, 0 items' })).toBeVisible();
}
async function addHeadphones(page: Page, quantity = '2') {
  await page.goto('/products/echo-headphones/');
  await ready(page);
  await page.getByRole('button', { name: 'Black', exact: true }).click();
  await page.getByRole('textbox', { name: 'Quantity', exact: true }).fill(quantity);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View cart', exact: true })).toBeVisible();
}
async function fillDemo(page: Page) {
  await page.getByRole('button', { name: 'Use demo details' }).click();
}
test('core desktop: filter, select, add two, change one, checkout, reload receipt', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Audio', exact: true }).click();
  await page.getByRole('textbox', { name: 'Maximum price' }).fill('150');
  await page.getByRole('checkbox', { name: 'In stock only' }).check();
  await page.getByRole('button', { name: /Apply \(/ }).click();
  await expect(page).toHaveURL(/category=Audio/);
  await expect(page).toHaveURL(/max=150/);
  await page.getByRole('link', { name: 'Echo Headphones', exact: true }).first().click();
  await page.getByRole('button', { name: 'Black', exact: true }).click();
  await page.getByRole('textbox', { name: 'Quantity', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();
  await page.getByRole('button', { name: 'Decrease quantity' }).click();
  await expect(page.getByRole('link', { name: 'Cart, 1 items' })).toBeVisible();
  await expect(page.locator('.summary').getByText('$113.98', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Checkout', exact: true }).first().click();
  await fillDemo(page);
  await page.getByRole('button', { name: 'Place demo order — $113.98' }).click();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(page.locator('.summary').getByText('$113.98', { exact: true })).toBeVisible();
  await page.goto('/products/echo-headphones/');
  await page.getByRole('button', { name: 'Black', exact: true }).click();
  await expect(page.getByText('Only 2 left', { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile: options swap, declined retry, successful order', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/nova-phone/');
  await ready(page);
  await page.getByRole('button', { name: 'Black', exact: true }).click();
  await page.getByRole('button', { name: '128 GB', exact: true }).click();
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  await page.getByRole('button', { name: 'Change options' }).click();
  await page.getByRole('button', { name: '256 GB', exact: true }).click();
  await page.getByRole('button', { name: 'Save options' }).click();
  await expect(page.locator('.summary').getByText('$647.99', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Checkout', exact: true }).first().click();
  await fillDemo(page);
  await page.getByText('Demo controls', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Simulated payment result' }).selectOption('declined');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Demo payment declined' })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('alex@example.com');
  await page.getByRole('combobox', { name: 'Simulated payment result' }).selectOption('success');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('pending refresh recovers same attempt; no address persists', async ({ page }) => {
  await addHeadphones(page, '1');
  await page.goto('/checkout/');
  await fillDemo(page);
  await page.getByLabel('Email', { exact: true }).fill('private-unique@example.com');
  await page.getByLabel('Full name', { exact: true }).fill('Private Unique Name');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'Processing your demo order' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  const raw = await page.evaluate(async () => {
    const request = indexedDB.open('form-demo-store', 1);
    const db: IDBDatabase = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = rej;
    });
    const get = db.transaction('state').objectStore('state').get('current');
    const value = await new Promise((res, rej) => {
      get.onsuccess = () => res(get.result);
      get.onerror = rej;
    });
    db.close();
    return JSON.stringify(value);
  });
  expect(raw).not.toContain('private-unique');
  expect(raw).not.toContain('Private Unique');
  expect(JSON.parse(raw).orders).toHaveLength(1);
  expect(JSON.parse(raw).inventoryDeductions['EH-B']).toBe(1);
});
test('cart persistence, undo, invalid quantity and empty state', async ({ page }) => {
  await addHeadphones(page);
  await page.goto('/cart/');
  await page.getByRole('textbox', { name: 'Quantity', exact: true }).fill('1e2');
  await page.getByRole('textbox', { name: 'Quantity', exact: true }).press('Tab');
  await expect(page.getByRole('textbox', { name: 'Quantity', exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Quantity', exact: true })).toHaveValue('2');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Quantity', exact: true })).toHaveValue('2');
});
test('two tabs share increments and lock cart during payment', async ({ page, context }) => {
  await addHeadphones(page, '1');
  const other = await context.newPage();
  await other.goto('/cart/');
  await expect(other.getByRole('textbox', { name: 'Quantity', exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(other.getByRole('textbox', { name: 'Quantity', exact: true })).toHaveValue('2');
  await page.goto('/checkout/');
  await fillDemo(page);
  await page.getByText('Demo controls', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Simulated payment result' }).selectOption('timeout');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(other.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();
  await other.getByRole('button', { name: 'Cancel simulation' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Simulation cancelled' })).toBeVisible();
  await expect(other.getByRole('button', { name: 'Remove', exact: true })).toBeEnabled();
});
test('mobile filter drafts cancel; dialog focus returns; search URL normalization', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'In stock only' }).check();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeFocused();
  expect(page.url()).not.toContain('stock');
  await page.getByRole('textbox', { name: 'Search products' }).fill('  nOvA   PHONE  ');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=nOvA\+PHONE/);
  await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveValue('relevance');
});
test('static deep links, unknown route and missing receipt', async ({ page }) => {
  for (const url of ['/products/aero-laptop/', '/cart/', '/checkout/', '/demo-info/']) {
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  await page.goto('/order/?id=demo-nonexistent');
  await expect(
    page.getByRole('heading', { name: 'Demo order not found on this browser' }),
  ).toBeVisible();
  const response = await page.goto('/products/does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
test('responsive grid and no horizontal overflow at all PRD and Hallmark widths', async ({
  page,
}) => {
  for (const width of [320, 359, 360, 375, 390, 414, 767, 768, 1023, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await ready(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}`,
    ).toBe(true);
    const columns = await page
      .locator('.product-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width < 360 ? 1 : width < 768 ? 2 : width < 1024 ? 3 : 4);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ['/products/nova-phone/', '/cart/', '/checkout/', '/demo-info/']) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
});
test('new cart after a completed order can checkout again', async ({ page }) => {
  await addHeadphones(page, '1');
  await page.goto('/checkout/');
  await fillDemo(page);
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  await page.goto('/products/solo-charger/');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  await page.getByRole('link', { name: 'Checkout', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Use demo details' })).toBeVisible();
  await fillDemo(page);
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
});
test('storage unavailable still permits the complete temporary flow', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open() {
          throw new Error('Test storage unavailable');
        },
      },
    });
  });
  await addHeadphones(page, '1');
  await expect(page.getByText(/Changes are temporary and will be lost/)).toBeVisible();
  await page.getByRole('link', { name: 'View cart', exact: true }).click();
  await page.getByRole('link', { name: 'Checkout', exact: true }).first().click();
  await fillDemo(page);
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'Demo order placed.' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Demo order not found on this browser' }),
  ).toBeVisible();
});
