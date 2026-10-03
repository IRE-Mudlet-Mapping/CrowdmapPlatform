import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { prepareExplorer } from "./prepare-explorer.mjs";

const baseConfig = {
  game: { id: "test", title: "The Test Map" },
  map: { source: "Map/map" },
};

test("copies and renders the shared explorer", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify({
    ...baseConfig,
    game: { id: "test", title: "The Test & Example Map" },
    explorer: {
      npcUrl: "./Map/denizen.json?kind=person&active=true",
      logo: "branding/logo.svg",
      theme: "light",
      credits: { author: "Map contributors", githubUrl: "https://example.test/maps" },
    },
  }));

  prepareExplorer(root);

  const index = readFileSync(join(root, "website", "index.html"), "utf8");
  assert.match(index, /<title>The Test &amp; Example Map by IRE-Mudlet-Mapping<\/title>/);
  const serializedConfig = index.match(/window\.MAP_CONFIG = ([\s\S]*?);\n/)[1];
  assert.deepEqual(JSON.parse(serializedConfig), {
    mapDataUrl: "Map/mapExport.json",
    colorsUrl: "Map/colors.json",
    title: "The Test & Example Map",
    npcUrl: "./Map/denizen.json?kind=person&active=true",
    logo: "branding/logo.svg",
    theme: "light",
    credits: { author: "Map contributors", githubUrl: "https://example.test/maps" },
  });
  assert.doesNotMatch(index, /\{\{[A-Z_]+\}\}/);
  assert.equal(readFileSync(join(root, "website", ".nojekyll"), "utf8"), "");
  assert.ok(statSync(join(root, "website", "index.min.css")).size > 0);
  assert.ok(statSync(join(root, "website", "index.min.js")).size > 0);
});

test("omits NPC integration unless configured", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify(baseConfig));

  prepareExplorer(root);

  const index = readFileSync(join(root, "website", "index.html"), "utf8");
  const serializedConfig = index.match(/window\.MAP_CONFIG = ([\s\S]*?);\n/)[1];
  assert.deepEqual(JSON.parse(serializedConfig), {
    mapDataUrl: "Map/mapExport.json",
    colorsUrl: "Map/colors.json",
    title: "The Test Map",
  });
});

test("refuses to replace the game repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "crowdmap-explorer-"));
  writeFileSync(join(root, "crowdmap.json"), JSON.stringify(baseConfig));

  assert.throws(() => prepareExplorer(root, "crowdmap.json", "."), /must be a child/);
});
