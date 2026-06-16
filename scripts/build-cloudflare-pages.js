"use strict";

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist-cloudflare");
const ydbStub = path.join(root, "src", "cloudflare", "ydb-store-stub.js");

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(path.join(root, "public"), outDir, { recursive: true });

async function main() {
  await esbuild.build({
    entryPoints: [path.join(root, "src", "cloudflare", "worker.js")],
    outfile: path.join(outDir, "_worker.js"),
    bundle: true,
    platform: "node",
    target: "es2022",
    format: "esm",
    mainFields: ["main", "module"],
    banner: {
      js: "import { createRequire as __cfCreateRequire } from 'node:module'; const require = __cfCreateRequire('file:///worker.js');"
    },
    plugins: [
      {
        name: "cloudflare-ydb-stub",
        setup(build) {
          build.onResolve({ filter: /^\.\/ydb-store$/ }, (args) => {
            const importer = args.importer.replace(/\\/g, "/");
            if (importer.endsWith("/src/store.js")) {
              return { path: ydbStub };
            }
            return null;
          });
        }
      }
    ],
    define: {
      "process.env.YDB_CONNECTION_STRING": '""',
      "process.env.YDB_METADATA_CREDENTIALS": '""'
    },
    logLevel: "info"
  });

  console.log(`Cloudflare Pages bundle written to ${outDir}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
