import { spawnSync } from "node:child_process";
import { resolvePlugins } from "./plugins.mjs";

const [configPath = "crowdmap.json", hook, baseDirectory = "."] = process.argv.slice(2);
for (const plugin of resolvePlugins(baseDirectory, configPath, hook)) {
  if (!plugin.packageJson) continue;
  const result = spawnSync("npm", ["ci", "--prefix", plugin.directory], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
