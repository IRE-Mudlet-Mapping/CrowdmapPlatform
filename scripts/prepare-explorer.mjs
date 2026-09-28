import { cpSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const platformDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const explorerDirectory = resolve(platformDirectory, "explorer");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function prepareExplorer(baseDirectory = ".", configPath = "crowdmap.json", outputDirectory = "website") {
  const root = realpathSync(baseDirectory);
  const configFile = isAbsolute(configPath) ? configPath : resolve(root, configPath);
  const output = isAbsolute(outputDirectory) ? outputDirectory : resolve(root, outputDirectory);
  const outputRelative = relative(root, output);

  if (!outputRelative || outputRelative.startsWith("..") || isAbsolute(outputRelative)) {
    throw new Error("Explorer output directory must be a child of the game repository");
  }

  const config = JSON.parse(readFileSync(configFile, "utf8"));
  const title = config.explorer?.title;
  if (typeof title !== "string" || title.length === 0) {
    throw new Error("crowdmap.json must define explorer.title");
  }

  rmSync(output, { recursive: true, force: true });
  cpSync(explorerDirectory, output, { recursive: true });

  const indexPath = resolve(output, "index.html");
  const npcUrl = config.explorer.npcUrl;
  const npcAttribute = typeof npcUrl === "string" && npcUrl.length > 0
    ? ` data-npc="${escapeHtml(npcUrl)}"`
    : "";
  const renderedIndex = readFileSync(indexPath, "utf8")
    .replaceAll("{{DOCUMENT_TITLE}}", `${escapeHtml(title)} by IRE-Mudlet-Mapping`)
    .replaceAll("{{EXPLORER_TITLE}}", escapeHtml(title))
    .replaceAll("{{NPC_ATTRIBUTE}}", npcAttribute);

  writeFileSync(indexPath, renderedIndex);
  return output;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [configPath = "crowdmap.json", outputDirectory = "website", baseDirectory = "."] = process.argv.slice(2);
  prepareExplorer(baseDirectory, configPath, outputDirectory);
}
