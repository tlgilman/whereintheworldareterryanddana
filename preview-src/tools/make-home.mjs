// Copies the page (preview-src/index.html) into app/home-page.json, which is what the site's front door
// (app/route.ts) serves. It runs by itself before every build: see "prebuild" in package.json.
// To see an edit to index.html under "npm run dev", run it by hand:  node preview-src/tools/make-home.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// the same text whichever way this computer stores line endings
const html = readFileSync(path.join(root, 'preview-src', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
if (!html.includes('<script type="module" id="appjs"')) throw new Error('preview-src/index.html does not look like the page: its script tag is missing');

const file = path.join(root, 'app', 'home-page.json');
const wanted = JSON.stringify({ html }) + '\n';
let current = '';
try { current = readFileSync(file, 'utf8'); } catch (error) { /* not written yet */ }
if (current !== wanted) writeFileSync(file, wanted);
console.log(`home page: ${html.length} characters, app/home-page.json ${current === wanted ? 'already up to date' : 'written'}`);
