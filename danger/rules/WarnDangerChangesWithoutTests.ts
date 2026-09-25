import type { DangerDSLType } from "danger";
import { SanityCheckRule } from "../classes/Rule.ts";

function isRuleSource(path: string) {
  return (
    (path.startsWith("danger/") && !path.startsWith("danger/tests/")) ||
    /^crowdmap\/plugins\/[^/]+\/.*danger(?:-rules)?\.(?:[cm]?[jt]s)$/.test(path)
  );
}

function isRuleTest(path: string) {
  return path.startsWith("danger/tests/") ||
    /^crowdmap\/plugins\/[^/]+\/.*(?:\.test|\.spec)\.(?:[cm]?[jt]s)$/.test(path);
}

export const warnDangerChangesWithoutTests = new SanityCheckRule(
  async (danger: DangerDSLType) => {
    const changed = [
      ...danger.git.modified_files,
      ...danger.git.created_files,
      ...danger.git.deleted_files,
    ];
    const testChanges = [...danger.git.modified_files, ...danger.git.created_files];
    return !changed.some(isRuleSource) || testChanges.some(isRuleTest);
  },
  "Danger rules changed without corresponding test changes."
);
