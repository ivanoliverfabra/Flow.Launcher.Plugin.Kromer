// src/commands/help.ts
import { JSONRPCResponse } from "flow-launcher-helper";
import { Command } from "../lib/command";

export class HelpCommand extends Command {
  name = "help";
  aliases = ["?"];

  constructor(private available: () => Command[]) {
    super();
  }

  async run(): Promise<JSONRPCResponse<string & {}>[]> {
    return this.available().map((c) => ({
      title: c.name,
      subtitle: c.aliases.length
        ? `Aliases: ${c.aliases.join(", ")}`
        : "No aliases",
    }));
  }
}