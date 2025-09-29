// src/commands/unalias.ts
import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";

const aliases = new AliasManager();

export class UnaliasCommand extends Command {
  name = "unalias";
  aliases = ["rmalias", "delalias"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, alias] = rawQuery.split(" ");

    if (!alias) {
      return [{ title: USAGE.unalias }];
    }

    aliases.delete(alias);

    return [
      { title: `${ICONS.delete} Alias Removed`, subtitle: alias },
    ];
  }
}