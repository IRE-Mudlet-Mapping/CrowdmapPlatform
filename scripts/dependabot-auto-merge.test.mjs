import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/auto-merge-dependabot.yml", import.meta.url), "utf8");
const eligibilityScript = workflow.match(/        run: \|\n([\s\S]*?)(?=      - name:)/)[1]
  .replace(/^          /gm, "");

for (const [name, number, author, base, eligible] of [
  ["validated Dependabot PR", "42", "dependabot[bot]", "development", true],
  ["ordinary PR", "42", "contributor", "development", false],
  ["Dependabot PR targeting another branch", "42", "dependabot[bot]", "main", false],
  ["run without a PR", "", "", "", false],
]) {
  test(`auto-merge eligibility: ${name}`, () => {
    const root = mkdtempSync(join(tmpdir(), "crowdmap-dependabot-"));
    const output = join(root, "output");
    // Mock only GitHub's responses; execute the actual workflow shell block.
    const mock = `gh() {
      case "$2" in
        */commits/*/pulls) printf '%s\\n' "$MOCK_NUMBER" ;;
        */pulls/*) printf '%s\\t%s\\n' "$MOCK_AUTHOR" "$MOCK_BASE" ;;
        *) return 1 ;;
      esac
    }\n`;
    try {
      const result = spawnSync("bash", ["-e", "-c", mock + eligibilityScript], {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_OUTPUT: output,
          REPOSITORY: "example/game",
          HEAD_SHA: "validated-sha",
          MOCK_NUMBER: number,
          MOCK_AUTHOR: author,
          MOCK_BASE: base,
        },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(output, "utf8"), eligible ? "eligible=true\nnumber=42\n" : "eligible=false\n");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("approval and merge require successful validation and an eligible PR", () => {
  assert.match(workflow, /if: github\.event\.workflow_run\.conclusion == 'success'/);
  const approval = workflow.indexOf("      - name: Approve validated dependency update");
  const merge = workflow.indexOf("      - name: Enable squash auto-merge");
  assert.ok(approval >= 0 && merge > approval, "Approve before enabling auto-merge");
  for (const step of [workflow.slice(approval, merge), workflow.slice(merge)]) {
    assert.match(step, /if: steps\.pull-request\.outputs\.eligible == 'true'/);
    assert.match(step, /&& steps\.update-policy\.outputs\.compatible == 'true'/);
    assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  }
  assert.match(workflow.slice(approval, merge), /run: gh pr review --approve "\$PR_URL"/);
  assert.match(workflow.slice(merge), /run: gh pr merge --auto --squash "\$PR_URL"/);
});

const policyScript = workflow.match(/      - name: Select compatible update types\n[\s\S]*?        run: \|\n([\s\S]*?)(?=      - name:)/)[1]
  .replace(/^          /gm, "");

for (const [updateType, compatible] of [
  ["version-update:semver-patch", true],
  ["version-update:semver-minor", true],
  ["version-update:semver-major", false],
  ["", false],
  ["unknown", false],
]) {
  test(`update policy: ${updateType || "missing metadata"}`, () => {
    const root = mkdtempSync(join(tmpdir(), "crowdmap-update-policy-"));
    const output = join(root, "output");
    try {
      const result = spawnSync("bash", ["-e", "-c", policyScript], {
        encoding: "utf8",
        env: { ...process.env, UPDATE_TYPE: updateType, GITHUB_OUTPUT: output },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(output, "utf8"), `compatible=${compatible}\n`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("metadata action receives a trusted PR context and keeps verification enabled", () => {
  const start = workflow.indexOf("      - name: Prepare Dependabot metadata context");
  const end = workflow.indexOf("      - name: Select compatible update types");
  const metadata = workflow.slice(start, end);
  assert.match(metadata, /gh api "\/repos\/\$REPOSITORY\/pulls\/\$PR_NUMBER" --jq '\{pull_request: \.\}'/);
  assert.match(metadata, /GITHUB_EVENT_PATH: \$\{\{ runner\.temp \}\}\/crowdmap-dependabot-event\.json/);
  assert.match(metadata, /uses: dependabot\/fetch-metadata@[a-f0-9]{40}/);
  assert.doesNotMatch(metadata, /skip-(?:commit-)?verification:/);
  assert.equal((metadata.match(/if: steps\.pull-request\.outputs\.eligible == 'true'/g) ?? []).length, 2);
});
