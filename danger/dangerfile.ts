import { danger } from "danger";
import * as rules from "./rules/index.ts";

for (const rule of Object.values(rules)) await rule.check(danger);
