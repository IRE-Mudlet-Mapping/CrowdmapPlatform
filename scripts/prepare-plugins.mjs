import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePlugins } from "./plugins.mjs";

const [configPath = "crowdmap.json", hook, baseDirectory = "."] = process.argv.slice(2);
const root = resolve(baseDirectory);
const dependencyDirectories = new Set();
if (existsSync(resolve(root, "package.json")) && existsSync(resolve(root, "package-lock.json"))) {
  dependencyDirectories.add(root);
}
for (const plugin of resolvePlugins(baseDirectory, configPath, hook)) {
  if (plugin.packageJson) dependencyDirectories.add(plugin.directory);
}

for (const directory of dependencyDirectories) {
  const result = spawnSync("npm", ["ci", "--ignore-scripts", "--prefix", directory], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
