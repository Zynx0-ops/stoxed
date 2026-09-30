// End-to-end playthrough: completes every lesson (with one deliberate mistake),
// exercising drag-and-drop, candle picking, matching, fill-in and numeric input.
// Usage: node tests/playthrough.mjs [baseUrl] [screenshotDir]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOTS = process.argv[3] || null;
const width = +(process.env.W || 1280), height = +(process.env.H || 900);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push(m.text()); });

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();
const shot = async name => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
await page.waitForTimeout(600);
await shot('00-home');

const primary = () => page.locator('#primary');
const clickPrimary = async () => { await primary().waitFor(); await page.waitForTimeout(80); await primary().click(); };

let madeMistake = false;
const shotTypes = new Set();

async function answer(step) {
  const t = step.type;
  if (t === 'mc' || t === 'tf') {
    const text = t === 'tf' ? (step.answer ? 'True' : 'False') : step.options[step.answer];
    let target = text;
    if (!madeMistake && t === 'mc') { target = step.options.find((_, i) => i !== step.answer); madeMistake = true; }
    await page.locator('.opt', { has: page.locator('.opt-txt', { hasText: new RegExp('^' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).first().click();
    return target === text;
  }
  if (t === 'fill') {
    for (const w of step.answer) await page.locator('.chip:not(.used)', { hasText: new RegExp('^' + w.replace('%', '\\%') + '$') }).first().click();
    return true;
  }
  if (t === 'num') { await page.fill('.num-in', String(step.answer)); return true; }
  if (t === 'pick') {
    await page.locator('.hits rect').nth(step.answer).click({ force: true });
    return true;
  }
  if (t === 'label') {
    const drops = page.locator('.drop');
    for (let ti = 0; ti < step.targets.length; ti++) {
      const chip = page.locator(`.lchip[data-label="${step.targets[ti].label}"]`);
      const a = await chip.boundingBox(), b = await drops.nth(ti).boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 - 20, { steps: 4 });
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(60);
    }
    return true;
  }
  if (t === 'match') {
    for (const [leftLabel, rightLabel] of step.pairs) {
      await page.locator('.match-col').nth(0).getByRole('button', { name: leftLabel, exact: true }).click();
      await page.locator('.match-col').nth(1).getByRole('button', { name: rightLabel, exact: true }).click();
      await page.waitForTimeout(450);
    }
    return true;
  }
  throw new Error('unknown type ' + t);
}

const course = await page.evaluate(() => window.STOX_COURSE.units.flatMap(u => u.lessons));
for (const [li, id] of course.entries()) {
  await page.locator(`.node-wrap[data-id="${id}"] .node`).click();
  await page.waitForTimeout(250);
  if (li === 0) await shot('01-popover');
  await page.locator('.popover .btn-primary').click();
  let guard = 0;
  while (guard++ < 60) {
    await page.waitForTimeout(120);
    if (await page.locator('.results').count()) break;
    const step = await page.evaluate(() => window.__stoxed.step());
    if (!step) throw new Error('no step');
    if (step.type === 'learn') {
      if (!shotTypes.has('learn-' + li) && SHOTS && li % 2 === 1) { shotTypes.add('learn-' + li); await page.waitForTimeout(1200); await shot(`learn-${id}`); }
      await clickPrimary(); continue;
    }
    const ok = await answer(step);
    if (!shotTypes.has(step.type) && SHOTS) { await page.waitForTimeout(900); await shot(`q-${step.type}-before`); }
    if (step.type !== 'match') await clickPrimary();
    try { await page.locator('.lfoot.ok, .lfoot.bad').waitFor({ timeout: 5000 }); }
    catch (e) { await shot('zz-stuck'); throw new Error(`Stuck on ${id} ${step.type}: "${step.prompt}"`); }
    const got = await page.locator('.lfoot.ok').count() > 0;
    if (got !== ok) throw new Error(`Lesson ${id}: expected ${ok ? 'correct' : 'wrong'} for ${step.type} "${step.prompt}"`);
    if (!shotTypes.has(step.type) && SHOTS) { shotTypes.add(step.type); await page.waitForTimeout(700); await shot(`q-${step.type}-after`); }
    if (!got && SHOTS && !shotTypes.has('wrong')) { shotTypes.add('wrong'); await shot('q-wrong'); }
    await clickPrimary();
  }
  await page.locator('.results').waitFor();
  const title = await page.locator('.results h1').textContent();
  console.log(`✓ ${id}: ${title}`);
  if (li === 0) { await page.waitForTimeout(1500); await shot('02-results'); }
  await clickPrimary();
  await page.waitForTimeout(li === 0 ? 1900 : 300);
  if (li === 0) await shot('03-unlocked');
}

const state = await page.evaluate(() => JSON.parse(localStorage.getItem('stoxed:v1')));
console.log('XP', state.xp, 'streak', state.streak, 'hearts', state.hearts, 'done', Object.keys(state.done).length);
await page.waitForTimeout(1200);
await shot('04-home-complete');
if (errors.length) { console.error('Console errors:\n' + errors.join('\n')); process.exitCode = 1; }
if (Object.keys(state.done).length !== course.length) { console.error('Not all lessons completed'); process.exitCode = 1; }
await browser.close();
