import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolvePlugins } from "./plugins.mjs";

function fixture(config) {
  const directory = mkdtempSync(join(tmpdir(), "crowdmap-plugin-"));
  const plugin = join(directory, "crowdmap", "plugins", "denizens");
  mkdirSync(plugin, { recursive: true });
  writeFileSync(join(directory, "crowdmap.json"), JSON.stringify(config));
  writeFileSync(join(plugin, "crowdmap-plugin.json"), JSON.stringify({
    id: "achaea-denizens",
    hooks: { "after-export": ["node", "run.mjs"] },
  }));
  return directory;
}

test("resolves a game-owned plugin for its declared hook", () => {
  const directory = fixture({ plugins: [{ path: "crowdmap/plugins/denizens" }] });
  try {
    const plugins = resolvePlugins(directory, "crowdmap.json", "after-export");
    assert.equal(plugins.length, 1);
    assert.equal(plugins[0].id, "achaea-denizens");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("rejects a plugin outside the game repository", () => {
  const directory = fixture({ plugins: [{ path: "../denizens" }] });
  try {
    assert.throws(() => resolvePlugins(directory));
  } finally {
    rmSync(directory, { recursive: true });
  }
});
