import assert from "node:assert/strict";
import test from "node:test";
import { validateCrowdmapConfig, validatePluginManifest } from "./validation.mjs";

const validConfig = () => ({
  game: { id: "achaea", title: "The Achaean Map" },
  map: { source: "Map/map" },
  plugins: [{ path: "crowdmap/plugins/achaea-danger-rules" }],
  explorer: {
    logo: "logo.svg",
    npcUrl: "Map/denizen.json",
    theme: "dark",
    credits: { author: "IRE Mapping", remark: { en: "Community maintained" } },
  },
});

test("accepts every supported crowdmap configuration field", () => {
  assert.equal(validateCrowdmapConfig(validConfig()).game.id, "achaea");
});

test("rejects unknown and malformed configuration fields", () => {
  assert.throws(() => validateCrowdmapConfig({ ...validConfig(), unexpected: true }), /unexpected.*not allowed/);
  assert.throws(() => validateCrowdmapConfig({ ...validConfig(), game: { id: "Achaea", title: "Achaea" } }), /game.id/);
  assert.throws(() => validateCrowdmapConfig({ ...validConfig(), explorer: { theme: "blue" } }), /explorer.theme/);
  assert.throws(() => validateCrowdmapConfig({ ...validConfig(), plugins: [{ path: "../outside" }] }), /plugins\[0\].path/);
});

test("validates the complete plugin manifest contract", () => {
  const manifest = {
    id: "achaea-denizens",
    hooks: {
      "after-export": ["node", "update.mjs"],
      "before-publish": ["node", "validate.mjs"],
      "after-publish": ["node", "report.mjs"],
    },
    dangerRules: "danger-rules.ts",
  };
  assert.equal(validatePluginManifest(manifest).id, "achaea-denizens");
  assert.throws(() => validatePluginManifest({ ...manifest, secrets: ["TOKEN"] }), /secrets.*not allowed/);
  assert.throws(() => validatePluginManifest({ ...manifest, hooks: { "after-export": [] } }), /non-empty command array/);
  assert.throws(() => validatePluginManifest({ ...manifest, dangerRules: "../rules.ts" }), /dangerRules/);
});
