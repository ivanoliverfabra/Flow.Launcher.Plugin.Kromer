import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS } from "../lib/const";

const aliases = new AliasManager();

export class ListAliasesCommand extends Command {
  name = "aliases";

  async run(): Promise<JSONRPCResponse<string & {}>[]> {
    const list = aliases.list();

    if (!list.length) {
      return [{ title: "No aliases saved" }];
    }

    return list.map(([alias, addr]) => ({
      title: `${ICONS.alias} ${alias}`,
      subtitle: addr,
    }));
  }
}