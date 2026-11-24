import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile('web/theme.js', 'utf8');

function browser({ saved = null, dark = false, blocked = false } = {}) {
  const events = {};
  const selectEvents = {};
  const warnings = [];
  const storage = new Map(saved === null ? [] : [['ai-basics-theme', saved]]);
  const select = { value: '', addEventListener: (name, handler) => { selectEvents[name] = handler; } };
  const media = { matches: dark, addEventListener: (name, handler) => { events[`media:${name}`] = handler; } };
  const root = { dataset: {} };
  let ready = false;
  runInNewContext(source, {
    DOMException,
    console: { warn: (...args) => warnings.push(args) },
    matchMedia: () => media,
    document: {
      documentElement: root,
      getElementById: () => ready ? select : null,
      addEventListener: (name, handler) => { events[name] = handler; },
    },
    localStorage: {
      getItem: key => { if (blocked) throw new DOMException('Blocked', 'SecurityError'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (blocked) throw new DOMException('Blocked', 'SecurityError'); storage.set(key, value); },
    },
  });
  const initialTheme = root.dataset.theme;
  ready = true;
  events.DOMContentLoaded();
  return {
    root, select, storage, warnings, initialTheme,
    choose: value => { select.value = value; selectEvents.change(); },
    system: value => { media.matches = value; events['media:change'](); },
  };
}

test('the initial theme follows the system before controls load and tracks changes until explicitly chosen', () => {
  const page = browser({ dark: true });
  assert.equal(page.initialTheme, 'dark');
  assert.equal(page.select.value, 'dark');
  page.system(false);
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(page.select.value, 'light');
  page.choose('dark');
  assert.equal(page.storage.get('ai-basics-theme'), 'dark');
  page.system(false);
  assert.equal(page.root.dataset.theme, 'dark');
});

test('saved choices override the system, survive reload and allow switching in both directions', () => {
  const page = browser({ saved: 'light', dark: true });
  assert.equal(page.initialTheme, 'light');
  page.choose('dark');
  assert.equal(browser({ saved: page.storage.get('ai-basics-theme') }).initialTheme, 'dark');
  page.choose('light');
  assert.equal(page.root.dataset.theme, 'light');
  assert.equal(browser({ saved: page.storage.get('ai-basics-theme'), dark: true }).initialTheme, 'light');
  assert.throws(() => page.choose('invalid'), /Unsupported theme/);
});

test('invalid preferences and unavailable storage are reported while theme switching remains usable', () => {
  const invalid = browser({ saved: 'invalid', dark: true });
  assert.equal(invalid.initialTheme, 'dark');
  assert.equal(invalid.warnings.length, 1);
  const blocked = browser({ blocked: true });
  blocked.choose('dark');
  assert.equal(blocked.root.dataset.theme, 'dark');
  assert.equal(blocked.warnings.length, 2);
});
