import { readFileSync } from "node:fs";

const configPath = process.argv[2] ?? "crowdmap.json";
const config = JSON.parse(readFileSync(configPath, "utf8"));
const required = ["game", "map", "explorer"];
const missing = required.filter((key) => !(key in config));

if (missing.length > 0 || config.map?.source !== "Map/map") {
  throw new Error(`Invalid ${configPath}: require ${missing.join(", ") || "map.source = Map/map"}`);
}
