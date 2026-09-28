import type { DangerDSLType } from "danger";

declare const fail: typeof import("danger").fail;
declare const message: typeof import("danger").message;
declare const warn: typeof import("danger").warn;

export interface Rule {
  check: (danger: DangerDSLType) => Promise<void>;
}

type Check = (danger: DangerDSLType) => Promise<boolean>;
type RuleMessage = string | (() => string);

function messageText(ruleMessage: RuleMessage) {
  return typeof ruleMessage === "string" ? ruleMessage : ruleMessage();
}

export class SanityCheckRule implements Rule {
  private readonly checkFunction: Check;
  private readonly ruleMessage: RuleMessage;

  constructor(checkFunction: Check, ruleMessage: RuleMessage) {
    this.checkFunction = checkFunction;
    this.ruleMessage = ruleMessage;
  }

  async check(danger: DangerDSLType) {
    if (!await this.checkFunction(danger)) warn(messageText(this.ruleMessage));
  }
}

export class RedGreenRule implements Rule {
  private readonly checkFunction: Check;
  private readonly ruleMessage: RuleMessage;

  constructor(checkFunction: Check, ruleMessage: RuleMessage) {
    this.checkFunction = checkFunction;
    this.ruleMessage = ruleMessage;
  }

  async check(danger: DangerDSLType) {
    if (await this.checkFunction(danger)) message(messageText(this.ruleMessage), { icon: ":heavy_check_mark:" });
    else fail(messageText(this.ruleMessage));
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

export class RoomCheckRule extends MapChangeRule {
  constructor(filteredRooms: unknown[], roomProperty: string, echoFoundRooms = true) {
    const roomIds = filteredRooms.map((room) =>
      typeof room === "object" && room !== null && "id" in room ? room.id : undefined
    );
    const text = filteredRooms.length === 0
      ? `No ${roomProperty}.`
      : echoFoundRooms
        ? `Found ${roomProperty}: ${roomIds.join(",")}`
        : `Found ${roomProperty}.`;

    super(async () => filteredRooms.length === 0, text);
  }
}
