import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { MudletMapReader } from "mudlet-map-binary-reader";

const baseDirectory = process.argv[2] ?? ".";
const mapDirectory = resolve(baseDirectory, "Map");
const map = MudletMapReader.readBuffer(readFileSync(resolve(mapDirectory, "map")));
const { mapData, colors } = MudletMapReader.export(map);

writeFileSync(resolve(mapDirectory, "map.json"), MudletMapReader.exportJson(map, false));
writeFileSync(resolve(mapDirectory, "map_mini.json"), MudletMapReader.exportJson(map, true));
writeFileSync(resolve(mapDirectory, "mapExport.json"), JSON.stringify(mapData));
writeFileSync(resolve(mapDirectory, "colors.json"), JSON.stringify(colors));

// Kept during migration for existing consumers. New explorer pages use the
// JSON files above rather than executable global assignments.
writeFileSync(resolve(mapDirectory, "mapExport.js"), `mapData = ${JSON.stringify(mapData)}`);
writeFileSync(resolve(mapDirectory, "colors.js"), `colors = ${JSON.stringify(colors)}`);
