import { AvailableAction, AvailableResult, Flow, FlowResponse } from "flow-plugin";

interface CommandMeta {
  name: string;
  usage?: string;
  description?: string;
  aliases?: string[];
}
export class Command implements CommandMeta {
  name: string;
  description?: string;
  usage?: string;
  aliases?: string[];
  protected flow = Flow;

  private constructor({ name, description, usage, aliases }: CommandMeta, run?: (args: string[], response: FlowResponse, alias: string) => Promise<void>) {
    this.name = name;
    this.description = description;
    this.usage = usage;
    this.aliases = aliases;
    if (run) this.run = run;
  }

  static create(meta: CommandMeta, run: (args: string[], response: FlowResponse, alias: string) => Promise<void>) {
    return new Command(meta, run);
  }

  async run(args: string[], response: FlowResponse, alias: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  matches(name: string): boolean {
    return this.name === name || (this.aliases?.includes(name) ?? false);
  }
}

export function cmd(meta: CommandMeta, run: (args: string[], response: FlowResponse, alias: string) => Promise<void>) {
  return Command.create(meta, run);
}

export function runCommand(commands: Command[], rawQuery: string, response: FlowResponse) {
  const [cmdName, ...args] = rawQuery.split(" ");
  const command = commands.find((c) => c.matches(cmdName));
  if (!command) {
    response.add({ title: `Unknown command: ${cmdName}`, subtitle: 'Type "kr help" for a list of commands' });
    return;
  }
  return command.run(args, response, cmdName);
}

export function previousPage({
  title = "Previous Page",
  subtitle = "Go back to the previous page",
  jsonRPCAction,
}: {
  title?: string;
  subtitle?: string;
  jsonRPCAction?: AvailableAction;
}): AvailableResult {
  return { title, subtitle, jsonRPCAction };
}

export function nextPage({
  title = "Next Page",
  subtitle = "Go to the next page",
  jsonRPCAction,
}: {
  title?: string;
  subtitle?: string;
  jsonRPCAction?: AvailableAction;
}): AvailableResult {
  return { title, subtitle, jsonRPCAction };
}