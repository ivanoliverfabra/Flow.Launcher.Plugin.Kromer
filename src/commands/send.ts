import { JSONRPCResponse } from "flow-launcher-helper";
import { Transaction } from "jskromer";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";
import { PrivateKey } from "../lib/private-key";

const aliases = new AliasManager();

export class SendCommand extends Command {
  name = "send";

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const parts = rawQuery.split(" ").filter(Boolean);

    if (parts.length !== 4) {
      return [{ title: USAGE.send }];
    }

    const [, fromInput, toInput, amountStr] = parts;
    const amount = Number(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return [{ title: `${ICONS.error} Invalid amount`, subtitle: USAGE.send }];
    }

    const from = aliases.resolve(fromInput);
    const to = aliases.resolve(toInput);

    const pk = new PrivateKey(from);
    if (!(await pk.exists())) {
      return [
        {
          title: `${ICONS.warn} No private key found`,
          subtitle: `Import first: import ${from} <privkey>`,
        },
      ];
    }

    try {
      const wallet = await pk.wallet();
      const tx = await Transaction.create(wallet, to, amount, {
        note: `Sent via FlowLauncher (${fromInput}→${toInput})`,
      });

      if (!tx.ok()) {
        return [{ title: `${ICONS.error} Transaction failed`, subtitle: tx.error() }];
      }

      return [
        {
          title: `${ICONS.send} Sent ${amount} KST`,
          subtitle: `From: ${fromInput} → ${toInput} (resolved: ${from} → ${to}) | tx: ${tx.id}`,
        },
      ];
    } catch (err: any) {
      return [{ title: ICONS.error + " Error", subtitle: err.message }];
    }
  }
}