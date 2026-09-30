import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:8765/';
const screenshots = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const simulatedStyles = await page.evaluate(async () => {
      const styles = await (await fetch('css/styles.css')).text();
      return styles.replace(/env\(safe-area-inset-top,\s*0px\)/g, '44px').replace(/env\(safe-area-inset-bottom,\s*0px\)/g, '34px');
    });
    await page.addStyleTag({ content: simulatedStyles });
    const homeBounds = await page.evaluate(() => ({
      headerBottom: document.querySelector('.topbar').getBoundingClientRect().bottom,
      bannerTop: document.querySelector('.unit').getBoundingClientRect().top,
    }));
    assert.ok(homeBounds.bannerTop >= homeBounds.headerBottom, `${theme}: home banner overlaps the safe-area header`);
    if (screenshots) await page.screenshot({ path: `${screenshots}/${theme}-home.png` });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const headerTop = await page.locator('.topbar').evaluate(element => element.getBoundingClientRect().top);
    assert.ok(Math.abs(headerTop - 44) < 1, `${theme}: sticky header ignores top inset`);
    await page.locator('.node-wrap.current .node').click();
    await page.locator('.popover .btn-primary').click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const lessonBounds = await page.evaluate(() => ({
      headerBottom: document.querySelector('.ltop').getBoundingClientRect().bottom,
      kickerTop: document.querySelector('.learn-kicker').getBoundingClientRect().top,
      footerPadding: getComputedStyle(document.querySelector('.lfoot')).paddingBottom,
      buttonBottom: document.querySelector('#primary').getBoundingClientRect().bottom,
      viewportHeight: innerHeight,
    }));
    assert.ok(lessonBounds.kickerTop >= lessonBounds.headerBottom, `${theme}: lesson kicker overlaps the safe-area header`);
    assert.equal(lessonBounds.footerPadding, '34px', `${theme}: footer ignores bottom inset`);
    assert.ok(lessonBounds.buttonBottom <= lessonBounds.viewportHeight - 34, `${theme}: continue button overlaps bottom inset`);
    if (screenshots) await page.screenshot({ path: `${screenshots}/${theme}-lesson.png` });
    console.log(`✓ ${theme}: home, sticky header, lesson and footer respect simulated 44px/34px safe areas`);
    await page.close();
  }
} finally {
  await browser.close();
}
