import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export function resolvePlugins(baseDirectory, configPath = "crowdmap.json", hook) {
  const base = resolve(baseDirectory);
  const config = JSON.parse(readFileSync(resolve(base, configPath), "utf8"));
  const plugins = (config.plugins ?? []).map(({ path }) => {
    const directory = resolve(base, path);
    if (relative(base, directory).startsWith("..")) {
      throw new Error(`Plugin path escapes the repository: ${path}`);
    }
    const manifest = JSON.parse(readFileSync(resolve(directory, "crowdmap-plugin.json"), "utf8"));
    if (typeof manifest.id !== "string" || typeof manifest.hooks !== "object") {
      throw new Error(`Invalid plugin manifest: ${path}/crowdmap-plugin.json`);
    }
    return { directory, packageJson: existsSync(resolve(directory, "package.json")), ...manifest };
  });
  return hook ? plugins.filter((plugin) => plugin.hooks[hook]) : plugins;
}
