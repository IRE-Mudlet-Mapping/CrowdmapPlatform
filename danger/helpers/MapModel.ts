import { readFileSync } from "node:fs";
import { MudletMapReader } from "mudlet-map-binary-reader";

const input = readFileSync("Map/map");
export default input.length > 0 ? MudletMapReader.readBuffer(input) : null;
