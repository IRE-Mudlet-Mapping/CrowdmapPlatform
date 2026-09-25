import type { DangerDSLType } from "danger";

declare const fail: typeof import("danger").fail;
declare const message: typeof import("danger").message;
declare const warn: typeof import("danger").warn;

export interface Rule {
  check: (danger: DangerDSLType) => Promise<void>;
}

type Check = (danger: DangerDSLType) => Promise<boolean>;

export class SanityCheckRule implements Rule {
  private readonly checkFunction: Check;
  private readonly text: string;

  constructor(checkFunction: Check, text: string) {
    this.checkFunction = checkFunction;
    this.text = text;
  }

  async check(danger: DangerDSLType) {
    if (!await this.checkFunction(danger)) warn(this.text);
  }
}

export class RedGreenRule implements Rule {
  private readonly checkFunction: Check;
  private readonly text: string;

  constructor(checkFunction: Check, text: string) {
    this.checkFunction = checkFunction;
    this.text = text;
  }

  async check(danger: DangerDSLType) {
    if (await this.checkFunction(danger)) message(this.text, { icon: ":heavy_check_mark:" });
    else fail(this.text);
  }
}

export class MapChangeRule extends RedGreenRule {
  async check(danger: DangerDSLType) {
    if (danger.git.fileMatch("Map/map").modified) await super.check(danger);
  }
}

export class SimpleFileChangeRule extends MapChangeRule {
  constructor(readableName: string, path: string) {
    super(async (danger) => danger.git.fileMatch(path).edited, `Updated ${readableName}.`);
  }
}
