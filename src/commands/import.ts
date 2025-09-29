import { JSONRPCResponse } from "flow-launcher-helper";
import { Command } from "../lib/command";
import { ICONS, USAGE } from "../lib/const";
import { PrivateKey } from "../lib/private-key";
import decodeKristV2Address from "../lib/v2-address";

export class ImportKeyCommand extends Command {
  name = "import";
  aliases = ["i"];

  async run(rawQuery: string): Promise<JSONRPCResponse<string & {}>[]> {
    const [, key] = rawQuery.split(" ");

    if (!key) {
      return [{ title: USAGE.import, subtitle: "" }];
    }

    let address: string;
    try {
      address = decodeKristV2Address(key);
    } catch (err: any) {
      return [
        { title: `${ICONS.error} Invalid private key`, subtitle: err.message },
      ];
    }

    const pk = new PrivateKey(address);
    if (await pk.exists()) {
      return [
        { title: `${ICONS.info} Key already exists`, subtitle: `Address: ${address}` },
      ];
    }

    await pk.set(key);

    return [
      { title: `${ICONS.import} Key Imported`, subtitle: `Stored for ${address}` },
    ];
  }
}