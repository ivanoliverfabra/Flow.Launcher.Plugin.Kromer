import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";
import { PrivateKey } from "../lib/private-key";

const aliases = new AliasManager();

export class DeleteKeyCommand extends Command {
  name = "delete";
  aliases = ["d"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, input] = rawQuery.split(" ");
    if (!input) {
      return [{ title: USAGE.delete, subtitle: "" }];
    }

    const address = aliases.resolve(input);
    const pk = new PrivateKey(address);

    if (!(await pk.exists())) {
      return [
        { title: `${ICONS.warn} No key found`, subtitle: `Address: ${address}` },
      ];
    }

    await pk.delete();
    aliases.delete(input);

    return [
      { title: `${ICONS.delete} Key Deleted`, subtitle: `Removed: ${input} (${address})` },
    ];
  }
}