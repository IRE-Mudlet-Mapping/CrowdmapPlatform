import { cpSync, copyFileSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateCrowdmapConfig } from "./validation.mjs";

const platformDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const explorerDirectory = resolve(platformDirectory, "explorer");
const browserDistributionDirectory = resolve(platformDirectory, "node_modules/mudlet-map-browser-script/dist");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function serializeScriptValue(value) {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function prepareExplorer(baseDirectory = ".", configPath = "crowdmap.json", outputDirectory = "website") {
  const root = realpathSync(baseDirectory);
  const configFile = isAbsolute(configPath) ? configPath : resolve(root, configPath);
  const output = isAbsolute(outputDirectory) ? outputDirectory : resolve(root, outputDirectory);
  const outputRelative = relative(root, output);

  if (!outputRelative || outputRelative.startsWith("..") || isAbsolute(outputRelative)) {
    throw new Error("Explorer output directory must be a child of the game repository");
  }

  const config = validateCrowdmapConfig(JSON.parse(readFileSync(configFile, "utf8")), configFile);
  const title = config.game.title;

  rmSync(output, { recursive: true, force: true });
  cpSync(explorerDirectory, output, { recursive: true });
  copyFileSync(resolve(browserDistributionDirectory, "index.min.css"), resolve(output, "index.min.css"));
  copyFileSync(resolve(browserDistributionDirectory, "index.min.js"), resolve(output, "index.min.js"));

  const indexPath = resolve(output, "index.html");
  const explorer = config.explorer ?? {};
  const browserConfig = {
    mapDataUrl: "Map/mapExport.json",
    colorsUrl: "Map/colors.json",
    title,
  };
  for (const key of ["npcUrl", "logo", "theme", "credits"]) {
    if (explorer[key] !== undefined) browserConfig[key] = explorer[key];
  }
  const renderedIndex = readFileSync(indexPath, "utf8")
    .replaceAll("{{DOCUMENT_TITLE}}", `${escapeHtml(title)} by IRE-Mudlet-Mapping`)
    .replaceAll("{{MAP_CONFIG}}", serializeScriptValue(browserConfig));

  writeFileSync(indexPath, renderedIndex);
  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath = "crowdmap.json", outputDirectory = "website", baseDirectory = "."] = process.argv.slice(2);
  prepareExplorer(baseDirectory, configPath, outputDirectory);
}
