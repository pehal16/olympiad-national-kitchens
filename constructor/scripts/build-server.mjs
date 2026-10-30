import { build } from "esbuild";
import fs from "node:fs";
for (const [entry, output] of [
  ["server/index.mjs", "server.cjs"],
  ["scripts/restore.mjs", "restore.cjs"],
  ["scripts/load.mjs", "load.cjs"],
  ["scripts/verify.mjs", "verify.cjs"],
])
  await build({
    entryPoints: [entry],
    outfile: "dist/" + output,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    packages: "external",
    define: {
      ...(output !== "server.cjs"
        ? { "process.env.CONSTRUCTOR_IMPORT_ONLY": "true" }
        : {}),
      "import.meta.filename": "__filename",
      "import.meta.dirname": "__dirname",
      "import.meta.url": "__filename",
    },
    logLevel: "info",
  });
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
fs.writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      dependencies: Object.fromEntries(
        Object.entries(pkg.dependencies).filter(
          ([name]) => !["react", "react-dom", "lucide-react"].includes(name),
        ),
      ),
    },
    null,
    2,
  ),
);
