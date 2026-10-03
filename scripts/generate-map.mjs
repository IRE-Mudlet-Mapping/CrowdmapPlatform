import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MudletMapReader } from "mudlet-map-binary-reader";
import { validateCrowdmapConfig } from "./validation.mjs";

const baseDirectory = process.argv[2] ?? ".";
const configPath = resolve(baseDirectory, "crowdmap.json");
validateCrowdmapConfig(JSON.parse(readFileSync(configPath, "utf8")), configPath);
const mapDirectory = resolve(baseDirectory, "Map");
const map = MudletMapReader.readBuffer(readFileSync(resolve(mapDirectory, "map")));
const { mapData, colors } = MudletMapReader.export(map);

writeFileSync(resolve(mapDirectory, "map.json"), MudletMapReader.exportJson(map, false));
writeFileSync(resolve(mapDirectory, "map_mini.json"), MudletMapReader.exportJson(map, true));
writeFileSync(resolve(mapDirectory, "mapExport.json"), JSON.stringify(mapData));
writeFileSync(resolve(mapDirectory, "colors.json"), JSON.stringify(colors));
