#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const require = createRequire(import.meta.url);

function findUp(filename, start) {
  let directory = resolve(start);
  while (true) {
    if (existsSync(join(directory, filename))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

function parseArguments(argv) {
  if (argv[0] !== "local") {
    throw new Error("Usage: crowdmap-danger local [--base <ref>]");
  }

  let base = "origin/development";
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] !== "--base" || !argv[index + 1]) {
      throw new Error("Usage: crowdmap-danger local [--base <ref>]");
    }
    base = argv[index + 1];
    index += 1;
  }
  return { base };
}

function isWithin(base, candidate) {
  const path = relative(base, candidate);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`);
}

export function configuredDangerPlugins(repositoryRoot) {
  const configPath = join(repositoryRoot, "crowdmap.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const plugins = [];
  for (const entry of config.plugins ?? []) {
    if (typeof entry?.path !== "string") continue;
    const pluginRoot = resolve(repositoryRoot, entry.path);
    if (!isWithin(repositoryRoot, pluginRoot)) {
      throw new Error(`Plugin path escapes the repository: ${entry.path}`);
    }
    const manifestPath = join(pluginRoot, "crowdmap-plugin.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (typeof manifest.dangerRules === "string") plugins.push(pluginRoot);
  }
  return plugins;
}

export async function prepareLocalDanger(pluginRoots, repositoryRoot) {
  const roots = Array.isArray(pluginRoots) ? pluginRoots : [pluginRoots];
  repositoryRoot ??= findUp("crowdmap.json", roots[0]);
  if (!repositoryRoot) throw new Error("Could not find the repository crowdmap.json");
  if (roots.length === 0) throw new Error("No game-owned Danger plugin is configured");
  const rulesPaths = roots.map((pluginRoot) => {
    const manifestPath = join(pluginRoot, "crowdmap-plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (typeof manifest.dangerRules !== "string") {
      throw new Error(`${manifestPath} must declare dangerRules as a module path`);
    }

    const rulesPath = resolve(pluginRoot, manifest.dangerRules);
    if (!isWithin(pluginRoot, rulesPath) || !existsSync(rulesPath)) {
      throw new Error(`${manifestPath} declares an invalid dangerRules module`);
    }
    return rulesPath;
  });

  // Bundle the extension module to CommonJS before giving it to Danger. Its
  // built-in TypeScript loader otherwise mixes CommonJS output with the
  // plugin's ESM package scope.
  const scratch = mkdtempSync(join(repositoryRoot, ".crowdmap-danger-local-"));
  try {
    await build({
      stdin: {
        contents: [
          ...rulesPaths.map((path, index) => `import * as plugin${index} from ${JSON.stringify(path)};`),
          `export const rules = [${rulesPaths.map((_, index) => `...Object.values(plugin${index})`).join(", ")}];`,
        ].join("\n"),
        loader: "ts",
        resolveDir: repositoryRoot,
      },
      outfile: join(scratch, "danger-rules.cjs"),
      bundle: true,
      format: "cjs",
      platform: "node",
      target: "node22",
      plugins: [{
        name: "preserve-import-meta-url",
        setup(build) {
          build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => {
            const extension = args.path.match(/\.([cm]?[jt]sx?)$/)?.[1] ?? "js";
            const loader = extension.endsWith("x")
              ? (extension.includes("t") ? "tsx" : "jsx")
              : (extension.includes("t") ? "ts" : "js");
            return {
              contents: readFileSync(args.path, "utf8").replaceAll(
                "import.meta.url",
                JSON.stringify(pathToFileURL(args.path).href),
              ),
              loader,
            };
          });
        },
      }],
    });
    writeFileSync(join(scratch, "dangerfile.ts"), [
      'const { rules } = require("./danger-rules.cjs");',
      "",
      "rules.forEach((rule) => rule.check(danger));",
      "",
    ].join("\n"));

    return scratch;
  } catch (error) {
    rmSync(scratch, { force: true, recursive: true });
    throw error;
  }
}

export async function runLocalDanger(argv = process.argv.slice(2), cwd = process.cwd()) {
  const { base } = parseArguments(argv);
  const repositoryRoot = findUp("crowdmap.json", cwd);
  if (!repositoryRoot) throw new Error("Could not find the repository crowdmap.json");
  const nearestPlugin = findUp("crowdmap-plugin.json", cwd);
  const pluginRoots = nearestPlugin && isWithin(repositoryRoot, nearestPlugin)
    ? [nearestPlugin]
    : configuredDangerPlugins(repositoryRoot);
  if (pluginRoots.length === 0) throw new Error("No game-owned Danger plugin is configured");

  const scratch = await prepareLocalDanger(pluginRoots, repositoryRoot);
  try {
    let dangerCli;
    for (const dependencyRoot of [repositoryRoot, ...pluginRoots]) {
      try {
        dangerCli = createRequire(join(dependencyRoot, "package.json")).resolve("danger/distribution/commands/danger.js");
        break;
      } catch {}
    }
    dangerCli ??= require.resolve("danger/distribution/commands/danger.js");
    const result = spawnSync(process.execPath, [
      dangerCli,
      "local",
      "--base", base,
      "--dangerfile", relative(repositoryRoot, join(scratch, "dangerfile.ts")),
      "--text-only",
      "--failOnErrors",
    ], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CROWDMAP_ROOT: repositoryRoot,
      },
      stdio: "inherit",
    });
    return result.status ?? 1;
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    process.exitCode = await runLocalDanger();
  } catch (error) {
    console.error(`${basename(process.argv[1])}: ${error.message}`);
    process.exitCode = 1;
  }
}
