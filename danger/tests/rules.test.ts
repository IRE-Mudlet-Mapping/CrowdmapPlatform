import assert from "node:assert/strict";
import test from "node:test";
import type { DangerDSLType } from "danger";
import { checkCorrectBranch } from "../rules/CorrectBranch.ts";
import { updateChangelog } from "../rules/UpdateChangelog.ts";
import { updateVersionFile } from "../rules/UpdateVersionFile.ts";

const results = { failures: [] as string[], messages: [] as string[], warnings: [] as string[] };
Object.assign(globalThis, {
  fail: (text: string) => results.failures.push(text),
  message: (text: string) => results.messages.push(text),
  warn: (text: string) => results.warnings.push(text),
});

function danger({ base = "development", modified = [], diffs = {} }: { base?: string; modified?: string[]; diffs?: Record<string, { before: string; after: string }> } = {}) {
  return {
    git: {
      fileMatch: (path: string) => ({ edited: modified.includes(path), modified: modified.includes(path) }),
      diffForFile: async (path: string) => diffs[path],
    },
    github: { pr: { base: { ref: base } } },
  } as unknown as DangerDSLType;
}

async function check(rule: { check: (input: DangerDSLType) => Promise<void> }, input = danger({ modified: ["Map/map"] })) {
  results.failures.length = results.messages.length = results.warnings.length = 0;
  await rule.check(input);
  return results;
}

test("warns only when the target is not development", async () => {
  assert.equal((await check(checkCorrectBranch)).warnings.length, 0);
  assert.equal((await check(checkCorrectBranch, danger({ base: "main" }))).warnings.length, 1);
});

test("requires a changelog with a map update", async () => {
  assert.equal((await check(updateChangelog)).failures.length, 1);
  assert.equal((await check(updateChangelog, danger({ modified: ["Map/map", "Map/changelog.txt"] }))).messages.length, 1);
});

test("requires the map version to increase by one", async () => {
  const valid = danger({ modified: ["Map/map", "Map/version.txt"], diffs: { "Map/version.txt": { before: "1", after: "2" } } });
  assert.equal((await check(updateVersionFile, valid)).messages.length, 1);
});
