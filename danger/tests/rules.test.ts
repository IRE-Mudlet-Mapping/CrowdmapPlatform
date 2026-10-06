import assert from "node:assert/strict";
import test from "node:test";
import type { DangerDSLType } from "danger";
import { RedGreenRule, RoomCheckRule, SanityCheckRule } from "../classes/Rule.ts";
import { checkCorrectBranch } from "../rules/CorrectBranch.ts";
import { createDisallowLockedAreasRule } from "../rules/DisallowLockedAreas.ts";
import { updateChangelog } from "../rules/UpdateChangelog.ts";
import { updateMainMapFile } from "../rules/UpdateMainMapFile.ts";
import { updateVersionFile } from "../rules/UpdateVersionFile.ts";
import { warnDangerChangesWithoutTests } from "../rules/WarnDangerChangesWithoutTests.ts";

const results = { failures: [] as string[], messages: [] as string[], warnings: [] as string[] };
Object.assign(globalThis, {
  fail: (text: string) => results.failures.push(text),
  message: (text: string) => results.messages.push(text),
  warn: (text: string) => results.warnings.push(text),
});

function danger({ base = "development", created = [], deleted = [], modified = [], diffs = {}, withPullRequest = true }: { base?: string; created?: string[]; deleted?: string[]; modified?: string[]; diffs?: Record<string, { before: string; after: string } | null>; withPullRequest?: boolean } = {}) {
  return {
    git: {
      created_files: created,
      deleted_files: deleted,
      modified_files: modified,
      fileMatch: (path: string) => ({ edited: created.includes(path) || deleted.includes(path) || modified.includes(path), modified: modified.includes(path), created: created.includes(path), deleted: deleted.includes(path) }),
      diffForFile: async (path: string) => diffs[path],
    },
    github: withPullRequest ? { pr: { base: { ref: base } } } : undefined,
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
  assert.equal((await check(checkCorrectBranch, danger({ withPullRequest: false }))).warnings.length, 0);
});

test("requires a changelog with a map update", async () => {
  assert.equal((await check(updateChangelog)).failures.length, 1);
  assert.equal((await check(updateChangelog, danger({ modified: ["Map/map", "Map/changelog.txt"] }))).messages.length, 1);
  assert.equal((await check(updateChangelog, danger({ modified: ["Map/map"], created: ["Map/changelog.txt"] }))).messages.length, 1);
  assert.deepEqual(await check(updateChangelog, danger()), { failures: [], messages: [], warnings: [] });
});

test("requires the binary map file with a map update", async () => {
  assert.equal((await check(updateMainMapFile, danger({ modified: [] }))).warnings.length, 1);
  assert.equal((await check(updateMainMapFile)).warnings.length, 0);
});

test("requires the map version to increase by one", async () => {
  const valid = danger({ modified: ["Map/map", "Map/version.txt"], diffs: { "Map/version.txt": { before: "1", after: "2" } } });
  assert.equal((await check(updateVersionFile, valid)).messages.length, 1);
});

test("rejects skipped, unchanged, decreasing and missing map versions", async () => {
  for (const after of ["43", "41", "40", "not a version"]) {
    const input = danger({ modified: ["Map/map", "Map/version.txt"], diffs: { "Map/version.txt": { before: "41", after } } });
    assert.equal((await check(updateVersionFile, input)).failures.length, 1, after);
  }
  assert.equal((await check(updateVersionFile)).failures.length, 1);
  assert.equal((await check(updateVersionFile, danger({ modified: ["Map/map", "Map/version.txt"], diffs: { "Map/version.txt": null } }))).failures.length, 1);
  assert.deepEqual(await check(updateVersionFile, danger()), { failures: [], messages: [], warnings: [] });
});

test("allows partially locked and empty areas, but skips checks on non-map PRs", async () => {
  const map = {
    areaNames: { 1: "Partly open", 2: "Empty" },
    areas: { 1: { rooms: [10, 11] }, 2: { rooms: [] } },
    rooms: { 10: { isLocked: true }, 11: { isLocked: false } },
  };
  assert.deepEqual((await check(createDisallowLockedAreasRule(map))).failures, []);
  assert.deepEqual((await check(createDisallowLockedAreasRule(map))).messages, ["All areas unlocked."]);
  map.rooms[11].isLocked = true;
  assert.deepEqual((await check(createDisallowLockedAreasRule(map))).failures, ["Found the following locked areas: Partly open"]);
  assert.deepEqual(await check(createDisallowLockedAreasRule(map), danger()), { failures: [], messages: [], warnings: [] });
});

test("rejects areas where every room is locked", async () => {
  const map = {
    areaNames: { 1: "Locked area", 2: "Open area" },
    areas: { 1: { rooms: [10] }, 2: { rooms: [11] } },
    rooms: { 10: { isLocked: true }, 11: { isLocked: false } },
  };
  assert.equal((await check(createDisallowLockedAreasRule(map), danger({ modified: ["Map/map"] }))).failures.length, 1);
  map.rooms[10].isLocked = false;
  assert.equal((await check(createDisallowLockedAreasRule(map), danger({ modified: ["Map/map"] }))).messages.length, 1);
});

test("requires tests for platform and game-owned Danger rule changes", async () => {
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["danger/rules/UpdateChangelog.ts"] }))).warnings.length, 1);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["crowdmap/plugins/achaea-danger/danger-rules.ts"] }))).warnings.length, 1);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["crowdmap/plugins/achaea-danger/danger-rules.ts", "crowdmap/plugins/achaea-danger/danger-rules.test.ts"] }))).warnings.length, 0);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ deleted: ["danger/rules/Obsolete.ts", "danger/tests/obsolete.test.ts"] }))).warnings.length, 0);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["danger/rules/UpdateChangelog.ts"], created: ["danger/tests/new.test.ts"] }))).warnings.length, 0);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["danger/rules/UpdateChangelog.ts"], deleted: ["danger/tests/obsolete.test.ts"] }))).warnings.length, 1);
  assert.equal((await check(warnDangerChangesWithoutTests, danger({ modified: ["Map/changelog.txt"] }))).warnings.length, 0);
});

test("evaluates lazily constructed rule messages", async () => {
  const redGreen = new RedGreenRule(async () => false, () => "Generated failure");
  assert.deepEqual((await check(redGreen)).failures, ["Generated failure"]);

  const sanity = new SanityCheckRule(async () => false, () => "Generated warning");
  assert.deepEqual((await check(sanity)).warnings, ["Generated warning"]);
});

test("reports IDs from failed room checks", async () => {
  const invalid = new RoomCheckRule([{ id: 10 }, { id: 12 }], "invalid rooms");
  assert.deepEqual((await check(invalid)).failures, ["Found invalid rooms: 10,12"]);

  const valid = new RoomCheckRule([], "invalid rooms");
  assert.deepEqual((await check(valid)).messages, ["No invalid rooms."]);
});
