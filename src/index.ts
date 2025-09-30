import { Flow } from "flow-plugin";

// Import all commands
import helpCommand from "./commands/help.js";
import sendTransactionCommand from "./commands/send.js";
import TransactionCommand from "./commands/transaction.js";
import walletCommand from "./commands/wallet.js";
import { Command, runCommand } from "./lib/command.js";

const commands: Command[] = [
  walletCommand,
  sendTransactionCommand,
  TransactionCommand,
] as const;
const helpCommandInstance = helpCommand(commands);

const flow = new Flow({ keepOrder: true, icon: "app.png" });

flow.on("query", async ({ prompt }, response) => {
  const parts = prompt.trim().split(" ");
  const [cmd] = parts;


  if (helpCommandInstance.matches(cmd) || cmd === "") {
    return helpCommandInstance.run([], response, cmd);
  }

  return runCommand(commands, prompt.trim(), response);
});