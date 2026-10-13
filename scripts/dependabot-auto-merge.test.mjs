import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/auto-merge-dependabot.yml", import.meta.url), "utf8");
const eligibilityScript = workflow.match(/        run: \|\n([\s\S]*?)(?=      - name:)/)[1].replace(/^          /gm, "");
const policyScript = workflow.match(/          script: \|\n([\s\S]*?)(?=      - name:)/)[1].replace(/^            /gm, "");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

for (const [name, number, author, base, eligible] of [
  ["Dependabot", "42", "dependabot[bot]", "development", true],
  ["ordinary PR", "42", "contributor", "development", false],
  ["other target", "42", "dependabot[bot]", "main", false],
  ["no PR", "", "", "", false],
]) {
  test(`eligibility: ${name}`, () => {
    const root = mkdtempSync(join(tmpdir(), "crowdmap-eligibility-"));
    const output = join(root, "output");
    try {
      const mock = `gh() { case "$2" in
        */commits/*/pulls) printf '%s\\n' "$MOCK_NUMBER" ;;
        */pulls/*) printf '%s\\t%s\\n' "$MOCK_AUTHOR" "$MOCK_BASE" ;;
        *) return 1 ;; esac; }\n`;
      const result = spawnSync("bash", ["-e", "-c", mock + eligibilityScript], {
        encoding: "utf8",
        env: { ...process.env, GITHUB_OUTPUT: output, REPOSITORY: "example/game", HEAD_SHA: "head", MOCK_NUMBER: number, MOCK_AUTHOR: author, MOCK_BASE: base },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(output, "utf8"), eligible ? "eligible=true\nnumber=42\n" : "eligible=false\n");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}

function commit(types = ["patch"], overrides = {}) {
  return {
    sha: "head",
    author: { login: "dependabot[bot]" },
    commit: {
      verification: { verified: true },
      message: `Bump dependencies\n\n---\nupdated-dependencies:\n${types.map((type, i) => `- dependency-name: package-${i}\n  update-type: version-update:semver-${type}`).join("\n")}\n...\n`,
    },
    ...overrides,
  };
}

function pullRequest(overrides = {}) {
  return { user: { login: "dependabot[bot]" }, base: { ref: "development" }, state: "open", head: { sha: "head" }, ...overrides };
}

async function policy(pr, commits, validatedSha = "head") {
  const outputs = {};
  const github = {
    rest: { pulls: { get: async () => ({ data: pr }), listCommits: async () => ({ data: commits }) } },
    paginate: async (method, parameters) => (await method(parameters)).data,
  };
  const core = { setOutput: (key, value) => { outputs[key] = value; }, info: () => {} };
  await new AsyncFunction("github", "core", "context", "process", policyScript)(
    github, core, { repo: { owner: "example", repo: "game" } }, { env: { PR_NUMBER: "42", HEAD_SHA: validatedSha } },
  );
  return outputs;
}

for (const [name, pr, commits, compatible, type] of [
  ["patch", pullRequest(), [commit()], true, "patch"],
  ["minor", pullRequest(), [commit(["minor"])], true, "minor"],
  ["major", pullRequest(), [commit(["major"])], false, "major"],
  ["mixed group", pullRequest(), [commit(["patch", "major"])], false, "major"],
  ["compatible group", pullRequest(), [commit(["patch", "minor"])], true, "minor"],
  ["multiple commits", pullRequest(), [commit(["patch"], { sha: "earlier" }), commit(["major"])], false, "major"],
  ["unknown type", pullRequest(), [commit(["unknown"])], false, "unknown"],
  ["unknown grouped type", pullRequest(), [commit(["patch", "unknown"])], false, "unknown"],
  ["missing commits", pullRequest(), [], false, "unknown"],
  ["ordinary author", pullRequest({ user: { login: "contributor" } }), [commit()], false, "unknown"],
  ["other target", pullRequest({ base: { ref: "main" } }), [commit()], false, "unknown"],
  ["human commit", pullRequest(), [commit([], { author: { login: "contributor" } })], false, "unknown"],
  ["human commit after a bot commit", pullRequest(), [commit(["patch"], { sha: "earlier" }), commit([], { author: { login: "contributor" } })], false, "unknown"],
  ["missing author", pullRequest(), [commit([], { author: null })], false, "unknown"],
  ["unsigned commit", pullRequest(), [commit([], { commit: { verification: { verified: false }, message: "" } })], false, "unknown"],
  ["missing metadata", pullRequest(), [commit([], { commit: { verification: { verified: true }, message: "Bump package" } })], false, "unknown"],
  ["closed PR", pullRequest({ state: "closed" }), [commit()], false, "patch"],
  ["stale validation", pullRequest({ head: { sha: "new-head" } }), [commit()], false, "patch"],
  ["commit snapshot mismatch", pullRequest(), [commit(["patch"], { sha: "new-head" })], false, "patch"],
]) {
  test(`verified update policy: ${name}`, async () => {
    assert.deepEqual(await policy(pr, commits), { compatible: String(compatible), "update-type": type === "unknown" ? type : `version-update:semver-${type}` });
  });
}

test("approval and merge are gated and bound to the validated commit", () => {
  assert.match(workflow, /if: github\.event\.workflow_run\.conclusion == 'success'/);
  for (const name of ["Approve validated dependency update", "Enable squash auto-merge"]) {
    const step = workflow.slice(workflow.indexOf(`      - name: ${name}`)).split(/\n      - name:/)[0];
    assert.match(step, /eligible == 'true' && steps\.update-policy\.outputs\.compatible == 'true'/);
    assert.match(step, /HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  }
  assert.match(workflow, /github\.rest\.pulls\.createReview/);
  assert.match(workflow, /gh pr merge --auto --squash --match-head-commit "\$HEAD_SHA"/);
  assert.doesNotMatch(workflow, /GITHUB_EVENT_PATH|dependabot\/fetch-metadata|gh pr review/);
});

const approvalStep = workflow.slice(workflow.indexOf("      - name: Approve validated dependency update")).split(/\n      - name:/)[0];
const approvalScript = approvalStep.match(/          script: \|\n([\s\S]*)/)[1].replace(/^            /gm, "");

test("approval submits a supported API request bound to the validated SHA", async () => {
  const requests = [];
  const github = { rest: { pulls: { createReview: async (parameters) => { requests.push(parameters); } } } };
  await new AsyncFunction("github", "context", "process", approvalScript)(
    github, { repo: { owner: "example", repo: "game" } }, { env: { PR_NUMBER: "42", HEAD_SHA: "validated-head" } },
  );
  assert.deepEqual(requests, [{
    owner: "example",
    repo: "game",
    pull_number: 42,
    event: "APPROVE",
    commit_id: "validated-head",
  }]);
});

test("approval API failure propagates and merge does not override failure gating", async () => {
  const error = new Error("GitHub rejected approval");
  const github = { rest: { pulls: { createReview: async () => { throw error; } } } };
  await assert.rejects(new AsyncFunction("github", "context", "process", approvalScript)(
    github, { repo: { owner: "example", repo: "game" } }, { env: { PR_NUMBER: "42", HEAD_SHA: "validated-head" } },
  ), (actual) => actual === error);
  const mergeStep = workflow.slice(workflow.indexOf("      - name: Enable squash auto-merge"));
  assert.doesNotMatch(approvalStep, /continue-on-error:/);
  assert.doesNotMatch(mergeStep, /always\(\)|failure\(\)|cancelled\(\)/);
});

test("real Dependabot PR metadata (optional read-only integration)", { skip: !process.env.CROWDMAP_VERIFY_LIVE_DEPENDABOT }, async () => {
  const request = async (suffix) => {
    const response = await fetch(`https://api.github.com/repos/IRE-Mudlet-Mapping/ImperianCrowdmap/pulls/10${suffix}`, {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "User-Agent": "crowdmap-policy-test" },
    });
    assert.equal(response.status, 200, `Read-only GitHub API request ${suffix}`);
    return response.json();
  };
  const pr = await request("");
  const commits = await request("/commits?per_page=100");
  assert.equal(pr.state, "closed", "Use the immutable merged Dependabot fixture, never mutate it");
  const outputs = await policy(pr, commits, pr.head.sha);
  assert.deepEqual(outputs, { compatible: "false", "update-type": "version-update:semver-patch" });
});
