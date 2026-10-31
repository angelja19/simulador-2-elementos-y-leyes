import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
});

test('título, tres ventanillas y circuito por defecto resuelto', async ({ page }, info) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Simulador 2 – Elementos y Leyes Principales sobre Circuitos');
  await expect(page.getByText('Sin errores').first()).toBeVisible();
  if (info.project.name === 'celular') await page.getByRole('tab', { name: /2\. Solución/ }).click();
  await expect(page.getByText('Concepto clave').first()).toBeVisible();
});

test('plantilla 5Iₓ del cuaderno y error al agregar un componente suelto', async ({ page }) => {
  await page.getByRole('button', { name: /Plantillas/ }).click();
  await page.locator('.card', { hasText: 'fuente dependiente 5Iₓ' }).getByRole('button').click();
  await expect(page.getByText(/480/).first()).toBeVisible();
  await page.getByRole('button', { name: /^Resistencia$/ }).click();
  const box = await page.locator('.canvas-wrap svg').boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.85, box!.y + box!.height * 0.12);
  await expect(page.getByText(/suelto/).first()).toBeVisible();
});

test('error provocado: fuentes de voltaje distintas en paralelo', async ({ page }, info) => {
  const c = {
    elements: [
      { id: 'a', kind: 'V', label: 'E1', value: '10', x: 0, y: 0, rot: 1 },
      { id: 'b', kind: 'V', label: 'E2', value: '12', x: 8, y: 0, rot: 1 },
      { id: 'r', kind: 'R', label: 'R1', value: '5', x: 8, y: 0, rot: 0 },
      { id: 'g', kind: 'GND', label: 'Tierra', value: '', x: 0, y: 4, rot: 0 },
    ],
    wires: [
      { id: 'w1', a: { x: 0, y: 0 }, b: { x: 8, y: 0 } },
      { id: 'w2', a: { x: 0, y: 4 }, b: { x: 12, y: 4 } },
      { id: 'w3', a: { x: 12, y: 0 }, b: { x: 12, y: 4 } },
    ],
  };
  const enc = Buffer.from(JSON.stringify(c)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await page.goto(`./#c=${enc}`);
  await expect(page.getByText(/Fuentes de voltaje en paralelo/).first()).toBeVisible();
  await page.screenshot({ path: `test-results/error-${info.project.name}.png` });
});

test('herramientas de resistividad y ley de Ohm; captura', async ({ page }, info) => {
  await page.getByRole('button', { name: /2.7 Resistencia/ }).click();
  await expect(page.getByText('Conductancia G = 1/R')).toBeVisible();
  await page.getByRole('button', { name: /2.8 Ley de Ohm/ }).click();
  await expect(page.getByText('3 A').first()).toBeVisible();
  await page.getByRole('button', { name: /Armar y analizar/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/captura-${info.project.name}.png` });
});
