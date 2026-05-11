import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const computeSdkDir = path.join(repoRoot, "node_modules", "@0gfoundation", "0g-compute-ts-sdk", "lib.esm");

const replacements = new Map([
  ["'child_process'", "'../../../../src/shims/child-process.js'"],
  ['"child_process"', '"../../../../src/shims/child-process.js"'],
  ["'fs/promises'", "'../../../../src/shims/fs-promises.js'"],
  ['"fs/promises"', '"../../../../src/shims/fs-promises.js"'],
  ["'node:fs/promises'", "'../../../../src/shims/fs-promises.js'"],
  ['"node:fs/promises"', '"../../../../src/shims/fs-promises.js"'],
  ["'fs'", "'../../../../src/shims/fs.js'"],
  ['"fs"', '"../../../../src/shims/fs.js"'],
  ["'path'", "'../../../../src/shims/path.js'"],
  ['"path"', '"../../../../src/shims/path.js"'],
  ["'stream/promises'", "'../../../../src/shims/stream-promises.js'"],
  ['"stream/promises"', '"../../../../src/shims/stream-promises.js"'],
  ["'node:stream/promises'", "'../../../../src/shims/stream-promises.js'"],
  ['"node:stream/promises"', '"../../../../src/shims/stream-promises.js"'],
  ["'stream-browserify/promises'", "'../../../../src/shims/stream-promises.js'"],
  ['"stream-browserify/promises"', '"../../../../src/shims/stream-promises.js"'],
  ["'readline'", "'../../../../src/shims/readline.js'"],
  ['"readline"', '"../../../../src/shims/readline.js"'],
]);

if (!existsSync(computeSdkDir)) {
  process.exit(0);
}

await patchDirectory(computeSdkDir);

async function patchDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const targetPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await patchDirectory(targetPath);
        return;
      }

      if (!/\.(js|mjs|cjs)$/.test(entry.name)) {
        return;
      }

      const original = await readFile(targetPath, "utf8");
      let next = original;
      for (const [from, to] of replacements.entries()) {
        next = next.split(from).join(to);
      }

      if (next !== original) {
        await writeFile(targetPath, next, "utf8");
      }
    }),
  );
}
