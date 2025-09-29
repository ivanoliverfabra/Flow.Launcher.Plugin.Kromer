// src/commands/txview.ts
import { JSONRPCResponse } from "flow-launcher-helper";
import { Transaction } from "jskromer";
import { Command } from "../lib/command";
import { ICONS } from "../lib/const";

export class TxViewCommand extends Command {
  name = "txview";
  aliases = ["txid"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, idStr] = rawQuery.split(" ");
    const id = parseInt(idStr, 10);

    if (!id) return [{ title: "Usage: txview <id>" }];

    try {
      const res = await Transaction.get(id);
      if (!res.ok()) {
        return [{ title: `${ICONS.error} Could not fetch TX`, subtitle: res.error() }];
      }

      return [
        {
          title: `${ICONS.send} TX ${id}`,
          subtitle: `${res.from} → ${res.to} | ${res.value} | ${new Date(
            res.time
          ).toLocaleString()}`,
        },
        {
          title: "Metadata",
          subtitle: JSON.stringify(res.metadata.json(), null, 2),
        },
      ];
    } catch (err: any) {
      return [{ title: `${ICONS.error} Error`, subtitle: err.message }];
    }
  }
}