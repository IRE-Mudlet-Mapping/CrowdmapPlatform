import { MudletMapReader } from "mudlet-map-binary-reader";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadMapModel(baseDirectory = process.env.CROWDMAP_ROOT ?? ".") {
  const inputFile = resolve(baseDirectory, "Map/map");
  const input = existsSync(inputFile) ? readFileSync(inputFile) : null;
  return input && input.length > 0 ? MudletMapReader.readBuffer(input) : null;
}

export default loadMapModel();
