import { Flow, JSONRPCResponse } from "flow-launcher-helper";
import { Params } from "flow-launcher-helper/lib/types";
import { Command } from "./command";
import { extractRawQuery } from "./utils";

export class CommandManager {
  private flow: Flow<string & {}>;
  private _commands: Command[] = [];

  constructor(icon: string) {
    this.flow = new Flow(icon);
  }

  register(command: Command) {
    this._commands.push(command);
  }

  get commands() {
    return this._commands;
  }

  init() {
    this.flow.on("query", async (params: Params) => {
      const raw = extractRawQuery(params);
      const [cmdWord] = raw.split(" ");

      const cmd = this._commands.find((c) => c.matches(cmdWord));
      if (!cmd) {
        this.flow.showResult({
          title: "Unknown command",
          subtitle: "Type 'help' for available commands",
        });
        return;
      }

      try {
        const results: JSONRPCResponse<string & {}>[] = await cmd.run(raw);
        this.flow.showResult(...results);
      } catch (err: any) {
        this.flow.showResult({
          title: "Error while running command",
          subtitle: err.message || String(err),
        });
      }
    });

    this.flow.run();
  }
}