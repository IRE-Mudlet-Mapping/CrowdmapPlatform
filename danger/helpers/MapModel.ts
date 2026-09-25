import { MudletMapReader } from "mudlet-map-binary-reader";
import { existsSync, readFileSync } from "fs";

const input = existsSync("./Map/map") ? readFileSync("./Map/map") : null;

export default input && input.length > 0 ? MudletMapReader.readBuffer(input) : null;
