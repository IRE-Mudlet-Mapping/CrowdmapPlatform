import { resolvePlugins } from "./plugins.mjs";

const configPath = process.argv[2] ?? "crowdmap.json";
const hook = process.argv[3];
const result = resolvePlugins(process.argv[4] ?? ".", configPath, hook);
process.stdout.write(`${JSON.stringify(result)}\n`);
