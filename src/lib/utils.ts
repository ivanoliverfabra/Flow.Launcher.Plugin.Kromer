import { Params } from "flow-launcher-helper/lib/types";

export function extractRawQuery(params: Params): string {
  if (Array.isArray(params) && typeof params[0] === "string") {
    return params[0];
  }
  if (typeof params === "string") return params;
  return "";
}
