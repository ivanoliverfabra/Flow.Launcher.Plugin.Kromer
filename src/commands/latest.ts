// src/commands/latest.ts
import { JSONRPCResponse } from "flow-launcher-helper";
import { Transaction } from "jskromer";
import { Command } from "../lib/command";
import { ICONS } from "../lib/const";

export class LatestCommand extends Command {
  name = "latest";
  aliases = ["recent", "txs"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const parts = rawQuery.split(" ").filter(Boolean);
    const [, pageStr] = parts;
    const page = Math.max(1, parseInt(pageStr || "1", 10));

    try {
      const res = await Transaction.listLatest({
        limit: 10,
        offset: (page - 1) * 10,
      });

      if (!res.ok()) {
        return [
          { title: `${ICONS.error} Could not fetch latest`, subtitle: res.error() },
        ];
      }

      if (!res.transactions.length) {
        return [{ title: "No recent transactions found" }];
      }

      return res.transactions.map((tx) => {
        const date = new Date(tx.time).toLocaleString();
        return {
          title: `${ICONS.send} ${tx.from} → ${tx.to} : ${tx.value}`,
          subtitle: `id: ${tx.id} | ${date}`,
        };
      });
    } catch (err: any) {
      return [{ title: `${ICONS.error} Error`, subtitle: err.message }];
    }
  }
}