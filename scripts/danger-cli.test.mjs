import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { configuredDangerPlugins, prepareLocalDanger } from "../danger/bin/crowdmap-danger.mjs";

test("bundles game rules in an isolated CommonJS workspace", async () => {
  const root = join(tmpdir(), `crowdmap-danger-cli-test-${process.pid}`);
  const plugin = join(root, "plugin");
  mkdirSync(join(plugin, "rules"), { recursive: true });
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({ plugins: [{ path: "plugin" }] }));
  writeFileSync(join(plugin, "crowdmap-plugin.json"), JSON.stringify({
    id: "test-rules",
    dangerRules: "danger-rules.ts",
  }));
  writeFileSync(join(plugin, "danger-rules.ts"), 'export { testRule } from "./rules/Test.ts";\n');
  writeFileSync(join(plugin, "rules", "Test.ts"), "export const testRule = {};\n");
  writeFileSync(join(plugin, "package.json"), JSON.stringify({ type: "module" }));
  mkdirSync(join(plugin, "node_modules"));
  writeFileSync(join(plugin, "node_modules", "ignored"), "ignored");

  let scratch;
  try {
    scratch = await prepareLocalDanger(plugin);
    assert.equal(existsSync(join(scratch, "package.json")), false);
    assert.equal(existsSync(join(scratch, "node_modules")), false);
    assert.match(readFileSync(join(scratch, "danger-rules.cjs"), "utf8"), /testRule/);
    assert.match(readFileSync(join(scratch, "dangerfile.ts"), "utf8"), /\.\/danger-rules\.cjs/);
  } finally {
    if (scratch) rmSync(scratch, { force: true, recursive: true });
    rmSync(root, { force: true, recursive: true });
  }
});

test("discovers game-owned Danger plugins from the repository config", () => {
  const root = join(tmpdir(), `crowdmap-danger-discovery-test-${process.pid}`);
  const dangerPlugin = join(root, "danger-plugin");
  const otherPlugin = join(root, "other-plugin");
  mkdirSync(dangerPlugin, { recursive: true });
  mkdirSync(otherPlugin, { recursive: true });
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({
    plugins: [{ path: "danger-plugin" }, { path: "other-plugin" }],
  }));
  writeFileSync(join(dangerPlugin, "crowdmap-plugin.json"), JSON.stringify({ dangerRules: "rules.ts" }));
  writeFileSync(join(otherPlugin, "crowdmap-plugin.json"), JSON.stringify({ hooks: {} }));

  try {
    assert.deepEqual(configuredDangerPlugins(root), [dangerPlugin]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
