import { MudletMapReader } from "mudlet-map-binary-reader";
import fs from "fs";

const input = fs.readFileSync("./Map/map");

export default input.length > 0 ? MudletMapReader.readBuffer(input) : null;
