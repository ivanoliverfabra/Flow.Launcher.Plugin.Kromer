import { JSONRPCResponse } from "flow-launcher-helper";
import { Wallet } from "jskromer";
import { AliasManager } from "../lib/alias-manager";
import { Command } from "../lib/command";
import { ICONS } from "../lib/const";

const aliases = new AliasManager();

export class TxCommand extends Command {
  name = "tx";
  aliases = ["transactions", "history"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const parts = rawQuery.split(" ").filter(Boolean);
    if (parts.length < 2) {
      return [{ title: "Usage: tx <address|alias> [page]" }];
    }

    const [, input, pageStr] = parts;
    const page = Math.max(1, parseInt(pageStr || "1", 10)); // default page = 1

    const address = aliases.resolve(input);

    try {
      const txs = await Wallet.getTransactions(address, {
        limit: 10,
        offset: (page - 1) * 10,
      });

      if (!txs.ok()) {
        return [{ title: `${ICONS.error} Could not fetch TXs`, subtitle: txs.error() }];
      }

      if (!txs.length) {
        return [{ title: `No transactions found`, subtitle: `Address: ${address}` }];
      }

      return txs.map((tx) => {
        const direction =
          tx.from.address === address ? "→" : "←";
        const counterparty =
          tx.from.address === address ? tx.to : tx.from;
        const value = tx.value;
        const date = new Date(tx.time).toLocaleString();

        return {
          title: `${ICONS.send} ${direction} ${counterparty} : ${value}`,
          subtitle: `id: ${tx.id} | ${date}`,
        };
      });
    } catch (err: any) {
      return [{ title: `${ICONS.error} Error`, subtitle: err.message }];
    }
  }
}