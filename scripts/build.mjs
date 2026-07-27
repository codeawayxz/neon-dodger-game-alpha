import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  cp(new URL('../index.html', import.meta.url), new URL('index.html', output)),
  cp(new URL('../src', import.meta.url), new URL('src', output), { recursive: true }),
  cp(new URL('../README.md', import.meta.url), new URL('README.md', output)),
]);
await rm(new URL('src/game/simulation/SurvivalSimulation.test.js', output), { force: true });

const [html, css, simulation, input, renderer, hud, main] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/style.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/simulation/SurvivalSimulation.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/game/input/InputController.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/render/NeonRenderer.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/ui/Hud.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.js', import.meta.url), 'utf8'),
]);

const stripExports = (source) => source.replaceAll('export class ', 'class ');
const stripImports = (source) => source
  .split('\n')
  .filter((line) => !line.startsWith('import '))
  .join('\n');
const bundle = [simulation, input, renderer, hud]
  .map(stripExports)
  .concat(stripImports(main))
  .join('\n\n');
const standalone = html
  .replace('<link rel="stylesheet" href="./src/style.css" />', `<style>\n${css}\n</style>`)
  .replace(
    '<script type="module" src="./src/main.js"></script>',
    `<script type="module">\n${bundle}\n</script>`,
  );

await writeFile(new URL('neon-voyager.html', output), standalone);

console.log('Built project and standalone game in dist/');
