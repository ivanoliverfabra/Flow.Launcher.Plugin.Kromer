import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";

const aliases = new AliasManager();

export class AliasCommand extends Command {
  name = "alias";

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, alias, address] = rawQuery.split(" ");

    if (!alias || !address) {
      return [{ title: USAGE.alias }];
    }

    aliases.set(alias, address);

    return [
      { title: `${ICONS.alias} Alias Saved`, subtitle: `${alias} → ${address}` },
    ];
  }
}