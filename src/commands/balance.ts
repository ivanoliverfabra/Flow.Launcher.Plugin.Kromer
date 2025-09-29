import { JSONRPCResponse } from "flow-launcher-helper";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";
import { PrivateKey } from "../lib/private-key";

const aliases = new AliasManager();

export class BalanceCommand extends Command {
  name = "balance";
  aliases = ["bal"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, input] = rawQuery.split(" ");

    if (!input) {
      return [{ title: USAGE.balance }];
    }

    const address = aliases.resolve(input);
    const pk = new PrivateKey(address);

    if (!(await pk.exists())) {
      return [
        { title: `${ICONS.warn} No key found`, subtitle: `Address: ${address}` },
      ];
    }

    try {
      const wallet = await pk.wallet();
      const res = await wallet.getBalance();

      if (!res.ok()) {
        return [
          { title: `${ICONS.error} Could not fetch balance`, subtitle: res.error() },
        ];
      }

      return [
        { title: `${ICONS.balance} Balance: ${res}`, subtitle: `Address: ${address}` },
      ];
    } catch (err: any) {
      return [{ title: `${ICONS.error} Error`, subtitle: err.message }];
    }
  }
}