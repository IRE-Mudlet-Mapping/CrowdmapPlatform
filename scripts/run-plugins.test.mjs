import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPlugins } from "./run-plugins.mjs";

test("runs every publication hook in lifecycle order", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-hooks-"));
  const plugin = join(root, "crowdmap", "plugins", "fixture");
  const marker = join(root, "hooks.txt");
  mkdirSync(plugin, { recursive: true });
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({
    game: { id: "fixture", title: "Fixture" },
    map: { source: "Map/map" },
    plugins: [{ path: "crowdmap/plugins/fixture" }],
  }));

  const command = (hook) => [
    "node",
    "-e",
    `require("node:fs").appendFileSync(process.env.CROWDMAP_ROOT + "/hooks.txt", "${hook}\\n")`,
  ];
  writeFileSync(join(plugin, "crowdmap-plugin.json"), JSON.stringify({
    id: "fixture",
    hooks: {
      "after-export": command("after-export"),
      "before-publish": command("before-publish"),
      "after-publish": command("after-publish"),
    },
  }));

  try {
    for (const hook of ["after-export", "before-publish", "after-publish"]) {
      assert.equal(runPlugins("crowdmap.json", hook, root), 0);
    }
    assert.equal(readFileSync(marker, "utf8"), "after-export\nbefore-publish\nafter-publish\n");
  } finally {
    rmSync(root, { recursive: true });
  }
});
