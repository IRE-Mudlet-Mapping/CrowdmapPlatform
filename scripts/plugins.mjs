import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { validateCrowdmapConfig, validatePluginManifest } from "./validation.mjs";

export function resolvePlugins(baseDirectory, configPath = "crowdmap.json", hook) {
  const base = resolve(baseDirectory);
  const absoluteConfigPath = resolve(base, configPath);
  const config = validateCrowdmapConfig(JSON.parse(readFileSync(absoluteConfigPath, "utf8")), configPath);
  const plugins = (config.plugins ?? []).map(({ path }) => {
    const directory = resolve(base, path);
    if (relative(base, directory).startsWith("..")) {
      throw new Error(`Plugin path escapes the repository: ${path}`);
    }
    const manifestPath = `${path}/crowdmap-plugin.json`;
    const manifest = validatePluginManifest(
      JSON.parse(readFileSync(resolve(directory, "crowdmap-plugin.json"), "utf8")),
      manifestPath,
    );
    return { directory, packageJson: existsSync(resolve(directory, "package.json")), ...manifest };
  });
  const duplicate = plugins.find((plugin, index) => plugins.findIndex(({ id }) => id === plugin.id) !== index);
  if (duplicate) throw new Error(`Duplicate plugin id: ${duplicate.id}`);
  if (hook === "danger") return plugins.filter((plugin) => plugin.dangerRules);
  return hook ? plugins.filter((plugin) => plugin.hooks[hook]) : plugins;
}
