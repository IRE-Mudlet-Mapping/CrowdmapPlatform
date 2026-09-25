import { danger } from "danger";
import * as extensions from "./extensions.ts";
import * as rules from "./rules/index.ts";

Object.values({ ...rules, ...extensions }).forEach((rule) => rule.check(danger));
