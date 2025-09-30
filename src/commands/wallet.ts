import { FlowActions } from "flow-plugin";
import { generateAddressV2, Wallet } from "jskromer";
import { cmd } from "../lib/command.js";
import { clearKeys, deleteKey, listKeys, saveKey } from "../lib/storage.js";
import {
  arg,
  formatCommand,
  Krawlet,
  tryCatch,
  tryCatchAsync,
} from "../lib/utils.js";

interface WalletInfo {
  address: string;
  balance: string;
  found: boolean;
  raw: Wallet;
  lastUpdated?: Date;
}

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return "0.00 KRO";
  if (num < 0.01) return `${balance} KRO`;
  return `${num.toFixed(2)} KRO`;
}

export default cmd(
  {
    name: "wallet",
    description: "Manage your saved Kromer wallets with enhanced features",
    aliases: ["w"],
    usage: formatCommand(
      "wallet",
      `list | add ${arg("privateKey")} ${arg(
        "confirm",
        true
      )} | remove ${arg("address")} ${arg("confirm", true)} | clear ${arg(
        "confirm",
        true
      )} | info ${arg("address")}`
    ),
  },
  async (args, response, alias) => {
    const [subcommand] = args;

    // Main menu
    if (!subcommand) {
      const commands = [
        { cmd: "list", desc: "View all stored wallets with balances" },
        { cmd: "add", desc: "Add a new wallet using private key" },
        { cmd: "remove", desc: "Remove a wallet from storage" },
        { cmd: "clear", desc: "Remove all stored wallets" },
        { cmd: "info", desc: "View detailed wallet information" },
      ];

      commands.forEach(({ cmd, desc }) => {
        response.add({
          title: `${cmd}`,
          subtitle: `${desc} - Run ${formatCommand(
            alias,
            cmd
          )} for more details`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, cmd)),
        });
      });
      return;
    }

    // List
    if (subcommand === "list") {
      const keysResult = await tryCatchAsync(() => listKeys());

      if (!keysResult.ok) {
        response.add({
          title: "Error loading wallets",
          subtitle: keysResult.error,
        });
        return;
      }

      const keys = keysResult.value;
      if (keys.length === 0) {
        response.add({
          title: "No stored wallets found",
          subtitle: `Get started by adding your first wallet`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "add ")),
        });
        return;
      }

      try {
        const wallets = await Promise.all(keys.map(Wallet.fromAddress));

        let totalBalance = 0;
        let activeWallets = 0;

        wallets.forEach((wallet) => {
          const balance = wallet.balance || 0;

          if (!isNaN(balance)) {
            totalBalance += balance;
            if (balance > 0) activeWallets++;
          }

          response.add({
            title: `${wallet.address}`,
            subtitle: `Balance: ${formatBalance(String(balance))}`,
            jsonRPCAction: FlowActions.changeQuery(
              formatCommand(alias, "info", wallet.address)
            )
          });
        });

        if (wallets.length > 1) {
          response.add({
            title: `Total Portfolio: ${formatBalance(totalBalance.toString())}`,
            subtitle: `${activeWallets} active wallet${activeWallets === 1 ? "" : "s"
              } with balance`,
          });
        }
      } catch (error) {
        response.add({
          title: "Error loading wallet data",
          subtitle: `${error}`,
        });
      }
      return;
    }

    // Add
    if (subcommand === "add") {
      if (args.length < 2) {
        response.add({
          title: "Add New Wallet",
          subtitle: `Usage: ${formatCommand(
            alias,
            "add",
            arg("privateKey"),
            arg("confirm", true)
          )}`,
        });
        response.add({
          title: "Private Key Format",
          subtitle: "Enter your Kromer v2 private key to add the wallet",
        });
        return;
      }

      const privateKey = args[1];
      const addressResult = tryCatch(() => generateAddressV2(privateKey));

      if (!addressResult.ok) {
        response.add({
          title: "Invalid Private Key",
          subtitle: `Error: ${addressResult.error}`,
        });
        response.add({
          title: "Need Help?",
          subtitle:
            "Make sure you're using a valid Kromer v2 private key format",
        });
        return;
      }

      const address = addressResult.value;
      const isConfirmed = args[2] === "confirm";

      const existingKeys = await listKeys();
      if (existingKeys.includes(address)) {
        response.add({
          title: "Wallet Already Exists",
          subtitle: `${address} is already in your stored wallets`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "list")),
        });
        return;
      }

      if (!isConfirmed) {
        response.add({
          title: `Add wallet ${address}?`,
          subtitle:
            "Your private key will be encrypted and stored securely using your system keychain",
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "add", privateKey, "confirm")
          ),
        });
        response.add({
          title: "Cancel",
          subtitle: "Return to wallet management",
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }

      const saveResult = await tryCatchAsync(() =>
        saveKey(address, privateKey)
      );
      if (!saveResult.ok) {
        response.add({
          title: "Failed to save wallet",
          subtitle: saveResult.error,
        });
        return;
      }

      response.add({
        title: `Wallet added successfully!`,
        subtitle: `${address} is now ready to use`,
        jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "list")),
      });
      return;
    }

    // Remove
    if (subcommand === "remove") {
      const keys = await listKeys();

      if (args.length < 2) {
        if (keys.length === 0) {
          response.add({
            title: "No stored wallets found to remove",
            subtitle: `Add a wallet first to manage your collection`,
            jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "add ")),
          });
          return;
        }

        response.add({
          title: "Select wallet to remove",
          subtitle: `Choose from ${keys.length} stored wallet${keys.length === 1 ? "" : "s"
            }`,
        });

        keys.forEach((addr) => {
          response.add({
            title: `Remove ${addr}`,
            subtitle: `Full address: ${addr}`,
            jsonRPCAction: FlowActions.changeQuery(
              formatCommand(alias, "remove", addr)
            ),
          });
        });
        return;
      }

      const address = args[1];
      const isConfirmed = args[2] === "confirm";

      if (!keys.includes(address)) {
        response.add({
          title: "Address Not Found",
          subtitle: `${address} is not in your stored wallets.`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "list")),
        });
        return;
      }

      if (!isConfirmed) {
        response.add({
          title: `Confirm removal of ${address}?`,
          subtitle:
            "This action cannot be undone. The private key will be permanently deleted.",
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "remove", address, "confirm")
          ),
        });
        response.add({
          title: "Cancel",
          subtitle: "Keep this wallet",
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "remove")),
        });
        return;
      }

      const deleteResult = await tryCatchAsync(() => deleteKey(address));
      if (!deleteResult.ok) {
        response.add({
          title: "Failed to remove wallet",
          subtitle: deleteResult.error,
        });
        return;
      }

      response.add({
        title: "Wallet Removed Successfully",
        subtitle: `${address} has been removed from your stored wallets`,
        jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "list")),
      });
      return;
    }

    // Clear
    if (subcommand === "clear") {
      const keys = await listKeys();
      if (keys.length === 0) {
        response.add({
          title: "No stored wallets found to clear",
          subtitle: "Your wallet storage is already empty",
        });
        return;
      }

      const isConfirmed = args[1] === "confirm";

      if (!isConfirmed) {
        response.add({
          title: `Clear all ${keys.length} wallets?`,
          subtitle:
            "This action cannot be undone. All private keys will be permanently deleted.",
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "clear", "confirm")
          ),
        });
        response.add({
          title: "Cancel",
          subtitle: "Keep all wallets",
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }

      const clearResult = await tryCatchAsync(() => clearKeys());
      if (!clearResult.ok) {
        response.add({
          title: "Failed to clear wallets",
          subtitle: clearResult.error,
        });
        return;
      }

      response.add({
        title: "All wallets cleared",
        subtitle: `Successfully removed ${keys.length} wallet${keys.length === 1 ? "" : "s"
          }`,
        jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "")),
      });
      return;
    }

    // Info
    if (subcommand === "info") {
      if (args.length < 2) {
        const keys = await listKeys();
        if (keys.length > 0) {
          keys.forEach((addr) => {
            response.add({
              title: `${addr}`,
              jsonRPCAction: FlowActions.changeQuery(
                formatCommand(alias, "info", addr)
              ),
            });
          });
        }
        return;
      }

      const address = args[1];

      try {
        const walletClass = await Wallet.fromAddress(address);
        const wallet = walletClass.data!;

        response.add({
          title: `Wallet Information: ${wallet.address}`,
          subtitle: `Full address: ${wallet.address}`,
        });

        response.add({
          title: `Balance: ${formatBalance(String(wallet.balance || "0"))}`,
          subtitle: "Status: Active",
          jsonRPCAction: FlowActions.openUrl(Krawlet.Wallet(walletClass))
        });

        response.add({
          title: "View in Krawlet",
          subtitle: "Open wallet in web explorer",
          jsonRPCAction: FlowActions.openUrl(Krawlet.Wallet(walletClass)),
        });
      } catch (error) {
        response.add({
          title: "Error loading wallet info",
          subtitle: `${error}`,
        });
      }
      return;
    }

    // Unknown command
    response.add({
      title: "Unknown subcommand",
      subtitle: `"${subcommand}" is not recognized. Available: list, add, remove, clear, info`,
      jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "")),
    });
  }
);