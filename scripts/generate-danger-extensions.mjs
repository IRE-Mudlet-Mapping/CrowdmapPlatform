import { existsSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { resolvePlugins } from "./plugins.mjs";

function isWithin(base, candidate) {
  const path = relative(base, candidate);
  return path !== "" && !path.startsWith(`..${sep}`) && path !== "..";
}

export function generateDangerExtensions(configPath = "crowdmap.json", outputPath = ".crowdmap-danger/extensions.ts", baseDirectory = ".") {
  const output = resolve(outputPath);
  const outputDirectory = resolve(output, "..");
  const extensions = resolvePlugins(baseDirectory, configPath)
    .filter((plugin) => plugin.dangerRules !== undefined)
    .map((plugin) => {
      if (typeof plugin.dangerRules !== "string") {
        throw new Error(`Plugin ${plugin.id} must declare dangerRules as a module path`);
      }

      const modulePath = resolve(plugin.directory, plugin.dangerRules);
      if (!isWithin(plugin.directory, modulePath) || !existsSync(modulePath)) {
        throw new Error(`Plugin ${plugin.id} declares an invalid dangerRules module`);
      }

      let importPath = relative(outputDirectory, modulePath).split(sep).join("/");
      if (!importPath.startsWith(".")) importPath = `./${importPath}`;
      return `export * from ${JSON.stringify(importPath)};`;
    });

  writeFileSync(output, `${extensions.join("\n") || "export {};"}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateDangerExtensions(...process.argv.slice(2));
}
