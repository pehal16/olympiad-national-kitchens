"use strict";

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const outfile = path.join(root, "public", "assets", "runtime", "dish-scene-3d.js");

async function buildOlympiadVisualRuntime() {
  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(root, "src", "client", "dish-scene-photo.js")],
    outfile,
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "esm",
    minify: true,
    legalComments: "none",
    logLevel: "info"
  });
  return outfile;
}

if (require.main === module) {
  buildOlympiadVisualRuntime().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
}

module.exports = { buildOlympiadVisualRuntime };
