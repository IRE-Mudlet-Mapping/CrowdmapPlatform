import { spawnSync } from "node:child_process";
import { resolvePlugins } from "./plugins.mjs";

const [configPath = "crowdmap.json", hook, baseDirectory = "."] = process.argv.slice(2);
for (const plugin of resolvePlugins(baseDirectory, configPath, hook)) {
  const command = plugin.hooks[hook];
  if (!Array.isArray(command) || command.length === 0 || !command.every((part) => typeof part === "string")) {
    throw new Error(`Plugin ${plugin.id} must declare ${hook} as a command array`);
  }
  const result = spawnSync(command[0], command.slice(1), {
    cwd: plugin.directory,
    env: { ...process.env, CROWDMAP_ROOT: baseDirectory },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
