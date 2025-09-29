import { JSONRPCResponse } from "flow-launcher-helper";

export abstract class Command {
  /** The word the user types (e.g. "send", "importkey") */
  abstract name: string;

  /** Aliases that also trigger this command */
  aliases: string[] = [];

  /**
   * Run the command.
   * @param rawQuery - the full input string typed in Flow Launcher
   */
  abstract run(
    rawQuery: string
  ): Promise<JSONRPCResponse<string & {}>[]>;

  matches(input: string): boolean {
    const lower = input.toLowerCase();
    return (
      lower === this.name.toLowerCase() ||
      this.aliases.some((a) => a.toLowerCase() === lower)
    );
  }
}