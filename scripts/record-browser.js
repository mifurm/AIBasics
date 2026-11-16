// Run in the integrated browser's runPlaywrightCode tool with its provided page.
// Replace STORAGE_DIRECTORY and GALLERY_URL; the completed script belongs there.
const storageDirectory = 'STORAGE_DIRECTORY';
const galleryUrl = 'GALLERY_URL';
await page.goto(galleryUrl);
await page.locator('#caseSelect').waitFor();
if (!(await page.evaluate(() => document.visibilityState === 'visible'))) {
  throw new Error('Reveal the integrated browser before recording.');
}
const records = await page.evaluate(async () => {
  const response = await fetch('./results.json');
  if (!response.ok) throw new Error(`Unable to load recording evidence: ${response.status}`);
  return response.json();
});
const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const even = value => Math.max(2, Math.floor(value / 2) * 2);
const scale = Math.min(1, 1280 / viewport.width);
for (let index = 0; index < records.length; index++) {
  const lab = records[index];
  const buttonName = `${lab.id.slice(0, 2)} ${lab.title}`;
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await page.getByRole('heading', { name: lab.title, exact: true }).waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screencast.start({
    path: `${storageDirectory}/${lab.id}.webm`,
    size: { width: even(viewport.width * scale), height: even(viewport.height * scale) },
  });
  try {
    await page.screencast.showActions();
    await page.screencast.showChapter(`Lab ${lab.id.slice(0, 2)}: ${lab.title}`);
    await page.waitForTimeout(1800);
    const variantCount = lab.modelComparison ? lab.results.length / 2 : lab.results.length;
    for (let variant = 0; variant < variantCount; variant++) {
      const entries = lab.modelComparison ? lab.results.slice(variant * 2, variant * 2 + 2) : [lab.results[variant]];
      await page.screencast.showChapter(entries[0].label);
      await page.getByLabel('Prompt variant', { exact: true }).selectOption(String(variant));
      for (const [offset, result] of entries.entries()) {
        const locator = lab.modelComparison ?
          page.locator(`[data-result-index="${variant * 2 + offset}"] .output`) : page.locator('#output');
        const output = await locator.textContent();
        if (result.status === 'blocked') {
          if (!output.includes('BLOCKED BY AZURE') || !output.includes('content_filter')) throw new Error('Blocked outcome was not displayed accurately.');
        } else if (output !== result.output) {
          throw new Error(`Displayed outcome differs from actual Azure record: ${lab.id}/${variant}`);
        }
        await locator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(2600);
      }
    }
    if (lab.id === '09-grounding') {
      await page.screencast.showChapter('Retained failure: the first answer omitted its citation');
      await page.getByText('First attempt: a real missing-citation failure', { exact: true }).click();
      await page.getByText('First attempt: a real missing-citation failure', { exact: true }).scrollIntoViewIfNeeded();
      await page.waitForTimeout(3200);
    }
    await page.screencast.showChapter('Discuss the limitation; change one variable');
    await page.locator('.discussion').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
  } finally {
    await page.screencast.stop();
  }
}
