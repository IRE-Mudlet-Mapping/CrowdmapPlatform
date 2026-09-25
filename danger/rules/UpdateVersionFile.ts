import type { DangerDSLType } from "danger";
import { MapChangeRule } from "../classes/Rule.ts";

export const updateVersionFile = new MapChangeRule(
  async (danger: DangerDSLType) => {
    const path = "Map/version.txt";
    if (!danger.git.fileMatch(path).edited) return false;
    const diff = await danger.git.diffForFile(path);
    if (diff === null) return false;
    return Number.parseInt(diff.before) + 1 === Number.parseInt(diff.after);
  },
  "Updated `version.txt` by 1."
);
