import { readFileSync } from "node:fs";
import { validateCrowdmapConfig } from "./validation.mjs";

const configPath = process.argv[2] ?? "crowdmap.json";
const config = JSON.parse(readFileSync(configPath, "utf8"));
validateCrowdmapConfig(config, configPath);
