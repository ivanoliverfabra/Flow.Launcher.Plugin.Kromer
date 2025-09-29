// src/commands/names.ts
import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";
import { PrivateKey } from "../lib/private-key";

const aliases = new AliasManager();

export class NamesCommand extends Command {
  name = "names";

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, input] = rawQuery.split(" ");
    if (!input) return [{ title: USAGE.names }];

    const address = aliases.resolve(input);
    const pk = new PrivateKey(address);

    if (!(await pk.exists())) {
      return [
        { title: `${ICONS.warn} No key found`, subtitle: `Address: ${address}` },
      ];
    }

    try {
      const wallet = await pk.wallet();
      const res = await wallet.getNames();

      if (!res.ok()) {
        return [{ title: "❌ Could not fetch names", subtitle: res.error() }];
      }

      return res.map((n) => ({
        title: `${ICONS.name} ${n.name}`,
        subtitle: `Owner: ${n.owner} | Unpaid: ${n.unpaid}`,
      }));
    } catch (err: any) {
      return [{ title: "❌ Error", subtitle: err.message }];
    }
  }
}