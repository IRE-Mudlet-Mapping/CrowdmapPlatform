import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const transpiler = require.resolve("danger/distribution/runner/runners/utils/transpiler.js");

test("Danger transpiles and executes TypeScript with and without a game tsconfig", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-danger-transpilation-"));
  const script = `
    const { typescriptify } = require(process.argv[1]);
    const { runInNewContext } = require("node:vm");
    const output = typescriptify("const room: number = 5129; globalThis.checkedRoom = room;", process.cwd());
    const context = {};
    runInNewContext(output, context);
    require("node:assert/strict").equal(context.checkedRoom, 5129);
  `;
  try {
    for (const withConfig of [false, true]) {
      if (withConfig) {
        writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { module: "NodeNext" } }));
      }
      const result = spawnSync(process.execPath, ["--eval", script, transpiler], {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `Danger transpilation (tsconfig=${withConfig}): ${result.stderr}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
