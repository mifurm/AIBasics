// Run in the integrated browser's runPlaywrightCode tool with its provided page.
// Replace STORAGE_DIRECTORY and GALLERY_URL; the completed script belongs there.
const storageDirectory = 'STORAGE_DIRECTORY';
const galleryUrl = 'GALLERY_URL';
await page.goto(galleryUrl);
await page.getByRole('heading', { name: 'From vague to useful', exact: true }).waitFor();
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
  const buttonName = `${String(index + 1).padStart(2, '0')} ${lab.title}`;
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await page.getByRole('heading', { name: lab.title, exact: true }).waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screencast.start({
    path: `${storageDirectory}/${lab.id}.webm`,
    size: { width: even(viewport.width * scale), height: even(viewport.height * scale) },
  });
  try {
    await page.screencast.showActions();
    await page.screencast.showChapter(`Lab ${index + 1}: ${lab.title}`);
    await page.waitForTimeout(1800);
    for (let variant = 0; variant < lab.results.length; variant++) {
      const result = lab.results[variant];
      await page.screencast.showChapter(result.label);
      await page.getByLabel('Prompt variant', { exact: true }).selectOption(String(variant));
      const output = await page.locator('#output').textContent();
      if (result.status === 'blocked') {
        if (!output.includes('BLOCKED BY AZURE') || !output.includes('content_filter')) throw new Error('Blocked outcome was not displayed accurately.');
      } else if (output !== result.output) {
        throw new Error(`Displayed outcome differs from actual Azure record: ${lab.id}/${variant}`);
      }
      await page.locator('#output').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2600);
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
