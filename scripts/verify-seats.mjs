/**
 * Seat-geometry acceptance check (throwaway harness — not part of the app bundle).
 *
 * Loads /play at three desktop viewports, deals a hand, then measures the
 * bounding rect of every seat cluster against the table stage, the coach panel,
 * and the action bar. Asserts that each seat is fully inside the stage and does
 * NOT intersect the coach panel or the action bar.
 *
 * Usage: BASE_URL=http://localhost:3100 node scripts/verify-seats.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const EPS = 1.5; // px tolerance for sub-pixel rounding
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const intersects = (a, b) =>
  !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
const contains = (outer, inner) =>
  inner.left >= outer.left - EPS &&
  inner.right <= outer.right + EPS &&
  inner.top >= outer.top - EPS &&
  inner.bottom <= outer.bottom + EPS;

const browser = await chromium.launch();
let anyFail = false;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto(`${BASE}/play`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for hydration so the deal button's React handler is attached, then
  // deal — re-clicking if the first click landed before hydration.
  const deal = page.getByRole('button', { name: /Deal me in/i });
  await deal.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(1000);
  const seated = async () =>
    (await page.locator('[data-testid="seat"]').count()) >= 5;
  for (let tries = 0; tries < 3 && !(await seated()); tries++) {
    if (await deal.isVisible().catch(() => false)) await deal.click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="seat"]').length >= 5,
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(500); // let the entrance animation settle

  const m = await page.evaluate(() => {
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height };
    };
    return {
      stage: r(document.querySelector('[data-testid="table-stage"]')),
      coach: r(document.querySelector('[data-testid="coach-panel"]')),
      bar: r(document.querySelector('[data-testid="action-bar"]')),
      seats: [...document.querySelectorAll('[data-testid="seat"]')].map((s) => ({
        id: Number(s.getAttribute('data-seat-id')),
        rect: r(s),
      })),
    };
  });

  console.log(`\n=== ${vp.name} ===`);
  console.log(
    `stage  ${fmt(m.stage)}\ncoach  ${fmt(m.coach)}\nbar    ${fmt(m.bar)}`,
  );
  const feltUnderCoach = intersects(m.stage, m.coach);
  console.log(`felt ∩ coach panel: ${feltUnderCoach ? 'OVERLAP ❌' : 'none ✓'}`);
  if (feltUnderCoach) anyFail = true;

  m.seats.sort((a, b) => a.id - b.id);
  for (const s of m.seats) {
    const inStage = contains(m.stage, s.rect);
    const hitCoach = intersects(s.rect, m.coach);
    const hitBar = intersects(s.rect, m.bar);
    const ok = inStage && !hitCoach && !hitBar;
    if (!ok) anyFail = true;
    console.log(
      `seat ${s.id}: ${fmt(s.rect)}  ⊆stage:${yn(inStage)}  ∩coach:${yn(!hitCoach)}  ∩bar:${yn(!hitBar)}  ${ok ? '✓' : '❌'}`,
    );
  }
  await page.close();
}

await browser.close();
console.log(`\n${anyFail ? 'RESULT: FAIL ❌' : 'RESULT: PASS ✓ — all seats inside stage, clear of coach panel & action bar'}`);
process.exit(anyFail ? 1 : 0);

function fmt(r) {
  return `[${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`;
}
function yn(b) {
  return b ? 'ok' : 'NO';
}
