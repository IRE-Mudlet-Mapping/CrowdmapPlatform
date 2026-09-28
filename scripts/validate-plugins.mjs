import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePlugins } from "./plugins.mjs";

const [configPath = "crowdmap.json", hook, baseDirectory = "."] = process.argv.slice(2);
const root = resolve(baseDirectory);
const validationDirectories = new Set();
if (existsSync(resolve(root, "package.json"))) validationDirectories.add(root);
for (const plugin of resolvePlugins(baseDirectory, configPath, hook)) {
  if (plugin.packageJson) validationDirectories.add(plugin.directory);
}

for (const directory of validationDirectories) {
  for (const script of ["test", "typecheck"]) {
    const result = spawnSync("npm", ["run", "--if-present", script], {
      cwd: directory,
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
