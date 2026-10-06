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
    const updated = [
      ...danger.git.modified_files,
      ...danger.git.created_files,
    ];
    const changed = [
      ...updated,
      ...danger.git.deleted_files,
    ];
    return !changed.some(isRuleSource) || updated.some(isRuleTest) ||
      (!updated.some(isRuleSource) && danger.git.deleted_files.some(isRuleTest));
  },
  "Danger rules changed without corresponding test changes."
);
