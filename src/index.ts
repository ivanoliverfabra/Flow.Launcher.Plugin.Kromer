// src/index.ts
import { CommandManager } from "./lib/command-manager";

import { DeleteKeyCommand } from "./commands/delete";
import { ImportKeyCommand } from "./commands/import";
import { SendCommand } from "./commands/send";

import { AliasCommand } from "./commands/alias";
import { ListAliasesCommand } from "./commands/aliases";
import { UnaliasCommand } from "./commands/unalias";

import { BalanceCommand } from "./commands/balance";
import { NamesCommand } from "./commands/names";

import { LatestCommand } from "./commands/latest";
import { TxCommand } from "./commands/tx";
import { TxViewCommand } from "./commands/txview";

import { HelpCommand } from "./commands/help";
import { DEFAULT_ICON } from "./lib/const";

const manager = new CommandManager(DEFAULT_ICON);

manager.register(new ImportKeyCommand());
manager.register(new DeleteKeyCommand());
manager.register(new SendCommand());
manager.register(new TxCommand());
manager.register(new TxViewCommand());
manager.register(new LatestCommand());
manager.register(new AliasCommand());
manager.register(new UnaliasCommand());
manager.register(new ListAliasesCommand());
manager.register(new BalanceCommand());
manager.register(new NamesCommand());
manager.register(new HelpCommand(() => manager.commands));

manager.init();