import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateCrowdmapConfig } from "./validation.mjs";

const workflow = readFileSync(new URL("../.github/workflows/json-diff.yml", import.meta.url), "utf8");
const fetchScript = workflow.match(/      - name: Fetch pull request map\n[\s\S]*?        run: \|\n([\s\S]*?)(?=      - name:)/)[1]
  .replace(/^          /gm, "")
  .replaceAll("${{ github.event.pull_request.number }}", "1");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.invalid",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.invalid",
    },
  });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}: ${result.stderr}`);
  return result;
}

for (const candidateConfig of ["missing", "untrusted"]) {
  test(`JSON diff overlays only the map when PR configuration is ${candidateConfig}`, () => {
    const root = mkdtempSync(join(tmpdir(), "crowdmap-workflow-trust-"));
    const repository = join(root, "repository");
    const current = join(root, "current");
    const trustedConfig = { game: { id: "imperian", title: "The Imperian Map" }, map: { source: "Map/map" }, plugins: [] };
    try {
      mkdirSync(join(repository, "Map"), { recursive: true });
      writeFileSync(join(repository, "crowdmap.json"), JSON.stringify(trustedConfig));
      writeFileSync(join(repository, "Map/map"), "base map bytes");
      writeFileSync(join(repository, "package.json"), "trusted dependencies");
      run("git", ["init", "-b", "development"], repository);
      run("git", ["add", "."], repository);
      run("git", ["commit", "-m", "base"], repository);
      run("git", ["switch", "-c", "candidate"], repository);
      if (candidateConfig === "missing") rmSync(join(repository, "crowdmap.json"));
      else writeFileSync(join(repository, "crowdmap.json"), "invalid untrusted config");
      writeFileSync(join(repository, "Map/map"), "candidate map bytes");
      writeFileSync(join(repository, "package.json"), "untrusted dependencies");
      run("git", ["add", "-A"], repository);
      run("git", ["commit", "-m", "candidate"], repository);
      run("git", ["update-ref", "refs/pull/1/head", "HEAD"], repository);
      run("git", ["switch", "development"], repository);
      run("git", ["clone", repository, current], root);
      run("bash", ["-e", "-c", fetchScript], current);
      const config = JSON.parse(readFileSync(join(current, "crowdmap.json"), "utf8"));
      assert.deepEqual(validateCrowdmapConfig(config), trustedConfig);
      assert.equal(readFileSync(join(current, "Map/map"), "utf8"), "candidate map bytes");
      assert.equal(readFileSync(join(current, "package.json"), "utf8"), "trusted dependencies");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("shared publication requires the development branch", () => {
  const publish = readFileSync(new URL("../.github/workflows/publish-map.yml", import.meta.url), "utf8");
  assert.match(publish, /jobs:\n  publish:\n    if: github\.ref == 'refs\/heads\/development'\n/);
});

test("JSON diff comments identify the exact PR head commit", () => {
  assert.match(workflow, /<summary>Open to see the diff for commit \$\{\{ github\.event\.pull_request\.head\.sha \}\}<\/summary>/);
});
