const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = /^[a-z0-9-]+$/;

function fail(source, path, message) {
  throw new Error(`Invalid ${source}: ${path} ${message}`);
}

function requireObject(value, source, path) {
  if (!object(value)) fail(source, path, "must be an object");
}

function rejectUnknown(value, allowed, source, path) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(source, `${path}.${key}`, "is not allowed");
  }
}

function requireString(value, source, path, { nonEmpty = false, pattern } = {}) {
  if (typeof value !== "string") fail(source, path, "must be a string");
  if (nonEmpty && value.length === 0) fail(source, path, "must not be empty");
  if (pattern && !pattern.test(value)) fail(source, path, "has an invalid format");
}

function requireRelativePath(value, source, path) {
  requireString(value, source, path, { nonEmpty: true });
  if (value.startsWith("/") || value.includes("..") || !/^[A-Za-z0-9_./-]+$/.test(value)) {
    fail(source, path, "must be a repository-relative path without '..'");
  }
}

function requireCommand(value, source, path) {
  if (!Array.isArray(value) || value.length === 0) fail(source, path, "must be a non-empty command array");
  value.forEach((part, index) => requireString(part, source, `${path}[${index}]`));
}

export function validateCrowdmapConfig(config, source = "crowdmap.json") {
  requireObject(config, source, "$config");
  rejectUnknown(config, ["game", "map", "plugins", "explorer"], source, "$config");

  requireObject(config.game, source, "game");
  rejectUnknown(config.game, ["id", "title"], source, "game");
  requireString(config.game.id, source, "game.id", { pattern: identifier });
  requireString(config.game.title, source, "game.title", { nonEmpty: true });

  requireObject(config.map, source, "map");
  rejectUnknown(config.map, ["source"], source, "map");
  if (config.map.source !== "Map/map") fail(source, "map.source", "must equal 'Map/map'");

  if (config.plugins !== undefined) {
    if (!Array.isArray(config.plugins)) fail(source, "plugins", "must be an array");
    config.plugins.forEach((plugin, index) => {
      const path = `plugins[${index}]`;
      requireObject(plugin, source, path);
      rejectUnknown(plugin, ["path"], source, path);
      requireRelativePath(plugin.path, source, `${path}.path`);
    });
  }

  if (config.explorer !== undefined) {
    requireObject(config.explorer, source, "explorer");
    rejectUnknown(config.explorer, ["logo", "npcUrl", "theme", "credits"], source, "explorer");
    for (const key of ["logo", "npcUrl"]) {
      if (config.explorer[key] !== undefined) requireString(config.explorer[key], source, `explorer.${key}`);
    }
    if (config.explorer.theme !== undefined && !["light", "dark"].includes(config.explorer.theme)) {
      fail(source, "explorer.theme", "must be 'light' or 'dark'");
    }
    if (config.explorer.credits !== undefined) {
      const credits = config.explorer.credits;
      requireObject(credits, source, "explorer.credits");
      rejectUnknown(credits, ["author", "githubUrl", "githubLabel", "remark"], source, "explorer.credits");
      for (const key of ["author", "githubUrl", "githubLabel"]) {
        if (credits[key] !== undefined) requireString(credits[key], source, `explorer.credits.${key}`);
      }
      if (credits.remark !== undefined && typeof credits.remark !== "string") {
        requireObject(credits.remark, source, "explorer.credits.remark");
        for (const [key, value] of Object.entries(credits.remark)) {
          requireString(value, source, `explorer.credits.remark.${key}`);
        }
      }
    }
  }

  return config;
}

export function validatePluginManifest(manifest, source = "crowdmap-plugin.json") {
  requireObject(manifest, source, "$manifest");
  rejectUnknown(manifest, ["id", "hooks", "dangerRules"], source, "$manifest");
  requireString(manifest.id, source, "id", { pattern: identifier });
  requireObject(manifest.hooks, source, "hooks");
  rejectUnknown(manifest.hooks, ["after-export", "before-publish", "after-publish"], source, "hooks");
  for (const [hook, command] of Object.entries(manifest.hooks)) {
    requireCommand(command, source, `hooks.${hook}`);
  }
  if (manifest.dangerRules !== undefined) requireRelativePath(manifest.dangerRules, source, "dangerRules");
  return manifest;
}
