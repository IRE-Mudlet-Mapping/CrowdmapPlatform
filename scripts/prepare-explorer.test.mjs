import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareExplorer } from "./prepare-explorer.mjs";

test("copies and renders the shared explorer", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({
    game: { title: "The Test & Example Map" },
    explorer: {
      npcUrl: "./Map/denizen.json?kind=person&active=true",
    },
  }));

  prepareExplorer(root);

  const index = readFileSync(join(root, "website", "index.html"), "utf8");
  assert.match(index, /<title>The Test &amp; Example Map by IRE-Mudlet-Mapping<\/title>/);
  assert.match(index, /<span id="title">The Test &amp; Example Map<\/span>/);
  assert.match(index, /data-npc="\.\/Map\/denizen\.json\?kind=person&amp;active=true"/);
  assert.doesNotMatch(index, /\{\{[A-Z_]+\}\}/);
  assert.equal(readFileSync(join(root, "website", ".nojekyll"), "utf8"), "");
});

test("omits NPC integration unless configured", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({ game: { title: "The Test Map" } }));

  prepareExplorer(root);

  const index = readFileSync(join(root, "website", "index.html"), "utf8");
  assert.doesNotMatch(index, /data-npc=/);
});

test("refuses to replace the game repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({ game: { title: "The Test Map" } }));

  assert.throws(() => prepareExplorer(root, "crowdmap.json", "."), /must be a child/);
});
