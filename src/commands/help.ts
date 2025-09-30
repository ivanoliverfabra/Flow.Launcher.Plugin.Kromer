import { FlowActions } from "flow-plugin";
import { cmd, Command } from "../lib/command.js";
import { formatCommand } from "../lib/utils.js";

export default (commands: Command[]) => cmd({
  name: "help",
  aliases: ["h", "?"],
  description: "Show this help message",
}, async (_, res) => {
  res.add({ title: "Kromer Plugin Help", subtitle: "Available Commands:" });
  commands.forEach((cmd) => {
    res.add({
      title: `${cmd.name} - ${cmd.description}`,
      subtitle: cmd.usage || "",
      jsonRPCAction: cmd.name !== "help" ? FlowActions.changeQuery(formatCommand(cmd.name)) : undefined,
    });
  });
})