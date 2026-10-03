import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolvePlugins } from "./plugins.mjs";

export function runPlugins(configPath = "crowdmap.json", hook, baseDirectory = ".", environment = process.env) {
  for (const plugin of resolvePlugins(baseDirectory, configPath, hook)) {
    const command = plugin.hooks[hook];
    const result = spawnSync(command[0], command.slice(1), {
      cwd: plugin.directory,
      env: { ...environment, CROWDMAP_ROOT: baseDirectory },
      stdio: "inherit",
    });
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath = "crowdmap.json", hook, baseDirectory = "."] = process.argv.slice(2);
  process.exitCode = runPlugins(configPath, hook, baseDirectory);
}
