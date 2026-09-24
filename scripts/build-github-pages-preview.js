const fs = require("node:fs");
const path = require("node:path");

const outputArg = process.argv[2];
if (!outputArg) {
  console.error("Usage: node scripts/build-github-pages-preview.js <empty-output-directory>");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const output = path.resolve(outputArg);
if (output === root || output.startsWith(`${root}${path.sep}`)) {
  console.error("Output must be outside the repository to avoid publishing other project files.");
  process.exit(1);
}
if (fs.existsSync(output) && fs.readdirSync(output).length) {
  console.error("Output directory must be empty.");
  process.exit(1);
}
fs.mkdirSync(output, { recursive: true });

function write(relative, contents) {
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function copy(sourceRelative, targetRelative = sourceRelative) {
  const source = path.join(root, "public", sourceRelative);
  const target = path.join(output, targetRelative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

let html = fs.readFileSync(path.join(root, "public", "visual-demo.html"), "utf8");
html = html
  .replace('href="/icons/icon-192.png"', 'href="./icons/icon-192.png"')
  .replace('href="/styles.css?', 'href="./styles.css?')
  .replace('href="/">← Вернуться к олимпиаде</a>', 'href="https://github.com/pehal16/olympiad-national-kitchens">Исходный проект на GitHub ↗</a>')
  .replace('src="/visual-demo.js?', 'src="./visual-demo.js?')
  .replace('<p class="lead">', '<p class="lead">Это пробная статическая версия для проверки доступности GitHub Pages в РФ. Ответы и данные участников здесь не сохраняются; официальную олимпиаду на этой странице проходить нельзя.</p>\n          <p class="lead">');
write("index.html", html);

let client = fs.readFileSync(path.join(root, "public", "visual-demo.js"), "utf8");
client = client
  .replace('const ASSET_ROOT = "/assets/olympiad/visual-v1";', 'const ASSET_ROOT = "./assets/olympiad/visual-v1";')
  .replace('import("/assets/runtime/dish-scene-3d.js?', 'import("./assets/runtime/dish-scene-3d.js?');
write("visual-demo.js", client);

let runtime = fs.readFileSync(path.join(root, "public", "assets", "runtime", "dish-scene-3d.js"), "utf8");
runtime = runtime.replaceAll("/assets/olympiad/", "./assets/olympiad/");
write("assets/runtime/dish-scene-3d.js", runtime);

copy("styles.css");
copy("icons/icon-192.png");
copy("assets/olympiad/visual-v1", "assets/olympiad/visual-v1");
copy("assets/olympiad/visual-v2", "assets/olympiad/visual-v2");
write(".nojekyll", "");
write("README.txt", "GitHub Pages preview only. No exam API, answer submission, scoring, or teacher journal.\n");

console.log(`Built static GitHub Pages preview in ${output}`);
