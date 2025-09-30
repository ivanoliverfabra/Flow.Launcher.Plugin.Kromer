import { Flow } from "flow-plugin";
import { Wallet } from "jskromer";
import { cmd } from "../lib/command.js";
import { listKeys, loadKey } from "../lib/storage.js";
import { arg, formatCommand, Krawlet, tryCatchAsync } from "../lib/utils.js";
import { isKromerV2Address } from "../lib/v2-address.js";

function parseAmount(amountStr: string): {
  valid: boolean;
  amount: number;
  error?: string;
} {
  if (!amountStr || amountStr.trim() === "") {
    return { valid: false, amount: 0, error: "Amount cannot be empty" };
  }
  const trimmed = amountStr.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      valid: false,
      amount: 0,
      error: "Amount must be a valid number with max 2 decimal places",
    };
  }
  const amount = parseFloat(trimmed);
  if (isNaN(amount)) {
    return { valid: false, amount: 0, error: "Invalid number format" };
  }
  if (amount <= 0) {
    return { valid: false, amount: 0, error: "Amount must be greater than 0" };
  }
  if (amount > 1000000) {
    return {
      valid: false,
      amount: 0,
      error: "Amount too large (max: 1,000,000 KRO)",
    };
  }
  return { valid: true, amount };
}

function formatAmount(amount: unknown): string {
  const transformedValue = typeof amount === "number"
    ? amount
    : typeof amount === "string"
      ? parseFloat(amount)
      : 0;
  return transformedValue.toFixed(2);
}

function formatBalance(balance: unknown): string {
  return `${formatAmount(balance)} KRO`;
}

interface WalletBalance {
  address: string;
  balance: number;
  available: boolean;
  error?: string;
}

async function getWalletBalance(address: string): Promise<WalletBalance> {
  try {
    const wallet = Wallet.from(address);
    const data = await wallet.getData();
    if (!data.ok()) {
      return {
        address,
        balance: 0,
        available: false,
        error: data.error(),
      };
    }
    return { address, balance: data.balance, available: true };
  } catch (error) {
    return {
      address,
      balance: 0,
      available: false,
      error: String(error),
    };
  }
}

export default cmd(
  {
    name: "send",
    description: "Send Kromer from one wallet to another with enhanced validation",
    aliases: ["s", "transfer", "tx"],
    usage: formatCommand(
      "send",
      arg("from"),
      arg("to"),
      arg("amount"),
      arg("confirm", true)
    ),
  },
  async (args, res, alias) => {
    const [fromAddr, toAddr, amountStr, confirmation] = args;
    if (!fromAddr) {
      const keysResult = await tryCatchAsync(() => listKeys());
      if (!keysResult.ok) {
        res.add({
          title: "Error loading wallets",
          subtitle: keysResult.error,
        });
        return;
      }
      const keys = keysResult.value;
      if (keys.length === 0) {
        res.add({
          title: "No stored wallets found",
          subtitle: "Add a wallet first to send Kromer",
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand("wallet", "add")
          ),
        });
        return;
      }
      res.add({
        title: "Send Kromer",
        subtitle: `Select source wallet (${keys.length} available)`,
      });

      const wallets = await Promise.all(keys.map(getWalletBalance));

      wallets.forEach(({ address, balance }) => {
        res.add({
          title: `${address}`,
          subtitle: `Balance: ${formatBalance(balance)}`,
          jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, address, "")),
        });
      });
      return;
    }
    if (!isKromerV2Address(fromAddr)) {
      res.add({
        title: "Invalid Source Address",
        subtitle: `${fromAddr} is not a valid Kromer v2 address`,
        jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
      });
      return;
    }
    if (!toAddr) {
      const walletBalance = await getWalletBalance(fromAddr);
      res.add({
        title: `Send from ${fromAddr}`,
        subtitle: walletBalance.available
          ? `Available balance: ${formatBalance(walletBalance.balance)}`
          : `Error: ${walletBalance.error}`,
      });

      if (!walletBalance.available) {
        res.add({
          title: "Cannot proceed",
          subtitle: "Unable to access wallet balance",
          jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }
      if (walletBalance.balance <= 0) {
        res.add({
          title: "Insufficient balance",
          subtitle: "This wallet has no KRO to send",
          jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }

      const keys = (await listKeys()).filter((k) => k !== fromAddr);

      if (keys.length > 0) {
        const keysWithBalances = await Promise.all(
          keys.map(async (k) => {
            const bal = await getWalletBalance(k);
            return { address: k, balance: bal.balance };
          })
        );

        keysWithBalances.forEach(({ address, balance }) => {
          res.add({
            title: `${address}`,
            subtitle: `Balance: ${formatBalance(balance)} • Select to send to this address`,
            jsonRPCAction: Flow.Actions.changeQuery(
              formatCommand(alias, fromAddr, address, "")
            ),
          });
        });
      }
      return;
    }
    if (!isKromerV2Address(toAddr)) {
      res.add({
        title: "Invalid Destination Address",
        subtitle: `${toAddr} is not a valid Kromer v2 address`,
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr)
        ),
      });
      return;
    }
    if (fromAddr === toAddr) {
      res.add({
        title: "Invalid Transaction",
        subtitle: "Cannot send to the same address",
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr)
        ),
      });
      return;
    }
    if (!amountStr) {
      const walletBalance = await getWalletBalance(fromAddr);
      res.add({
        title: `${fromAddr} → ${toAddr}`,
        subtitle: walletBalance.available
          ? `Available: ${formatBalance(
            walletBalance.balance
          )} • Enter amount to send`
          : `Error: ${walletBalance.error}`,
      });
      if (!walletBalance.available) {
        res.add({
          title: "Cannot proceed",
          subtitle: "Unable to access wallet balance",
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr)
          ),
        });
        return;
      }
      const balance = walletBalance.balance;
      const suggestions = [
        { amount: Math.min(1, balance), label: "1 KRO" },
        { amount: Math.min(10, balance), label: "10 KRO" },
        { amount: Math.min(100, balance), label: "100 KRO" },
        { amount: balance * 0.25, label: "25% of balance" },
        { amount: balance * 0.5, label: "50% of balance" },
        { amount: balance, label: "All balance" },
      ].filter((s) => s.amount > 0 && s.amount <= balance);
      if (suggestions.length > 0) {
        res.add({
          title: "Quick amounts",
          subtitle: "Select a suggested amount or enter custom",
        });
        suggestions.slice(0, 4).forEach((suggestion) => {
          if (suggestion.amount >= 0.01) {
            res.add({
              title: suggestion.label,
              subtitle: `Send ${formatAmount(suggestion.amount)} KRO`,
              jsonRPCAction: Flow.Actions.changeQuery(
                formatCommand(
                  alias,
                  fromAddr,
                  toAddr,
                  formatAmount(suggestion.amount)
                )
              ),
            });
          }
        });
      }
      res.add({
        title: "Custom amount",
        subtitle: `Format: ${formatCommand(
          alias,
          fromAddr,
          toAddr,
          arg("amount")
        )}`,
      });
      return;
    }
    const amountValidation = parseAmount(amountStr);
    if (!amountValidation.valid) {
      res.add({
        title: "Invalid Amount",
        subtitle: amountValidation.error,
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr, toAddr)
        ),
      });
      return;
    }
    const amount = amountValidation.amount;
    if (confirmation !== "confirm") {
      const walletBalance = await getWalletBalance(fromAddr);
      if (!walletBalance.available) {
        res.add({
          title: "Cannot access wallet",
          subtitle: walletBalance.error,
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr)
          ),
        });
        return;
      }
      if (walletBalance.balance < amount) {
        res.add({
          title: "Insufficient Balance",
          subtitle: `Available: ${formatBalance(
            walletBalance.balance
          )} • Requested: ${formatAmount(amount)} KRO`,
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr, toAddr, "")
          ),
        });
        return;
      }
      const remaining = walletBalance.balance - amount;
      res.add({
        title: `${fromAddr} → ${toAddr}`,
        subtitle: `${formatBalance(amount)} → ${formatBalance(remaining)} • Click to confirm`,
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr, toAddr, amountStr, "confirm")
        ),
      });
      res.add({
        title: "Cancel",
        subtitle: "Return to amount selection",
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr, toAddr, "")
        ),
      });
      return;
    }
    try {
      const keyResult = await tryCatchAsync(() => loadKey(fromAddr));
      if (!keyResult.ok) {
        res.add({
          title: "Wallet Error",
          subtitle: "Could not access wallet private key",
          jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }
      const walletResult = await tryCatchAsync(() =>
        Wallet.fromPrivateKey(keyResult.value || "")
      );
      if (!walletResult.ok) {
        res.add({
          title: "Wallet Error",
          subtitle: `Failed to initialize wallet: ${walletResult.error}`,
          jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
        });
        return;
      }
      const wallet = walletResult.value;
      const balanceResult = await tryCatchAsync(() => wallet.getBalance());
      if (!balanceResult.ok) {
        res.add({
          title: "Balance Check Failed",
          subtitle: balanceResult.error,
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr)
          ),
        });
        return;
      }
      const balance = balanceResult.value;
      if (!balance.ok()) {
        res.add({
          title: "Balance Check Failed",
          subtitle: balance.error(),
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr)
          ),
        });
        return;
      }
      if ((balance as any) < amount) {
        res.add({
          title: "Insufficient Balance",
          subtitle: `Current balance: ${formatBalance(balance as any)} KRO`,
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr, toAddr)
          ),
        });
        return;
      }
      const txResult = await tryCatchAsync(() =>
        wallet.send(toAddr, amount, {
          message: "Sent via Kromer Flow Plugin",
        })
      );
      if (!txResult.ok) {
        res.add({
          title: "Transaction Failed",
          subtitle: txResult.error,
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr, toAddr, amountStr)
          ),
        });
        return;
      }
      const tx = txResult.value;
      if (!tx.ok()) {
        res.add({
          title: "Transaction Failed",
          subtitle: tx.error(),
          jsonRPCAction: Flow.Actions.changeQuery(
            formatCommand(alias, fromAddr, toAddr, amountStr)
          ),
        });
        return;
      }
      res.add({
        title: "Transaction Successful",
        subtitle: `Sent ${formatAmount(amount)} KRO • TX ID: ${tx.id}`,
        jsonRPCAction: Flow.Actions.openUrl(Krawlet.Transaction(tx)),
      });
      res.add({
        title: "View on Krawlet",
        subtitle: "Click to open transaction in web explorer",
        jsonRPCAction: Flow.Actions.openUrl(Krawlet.Transaction(tx)),
      });
      res.add({
        title: "Send Another",
        subtitle: "Start a new transaction",
        jsonRPCAction: Flow.Actions.changeQuery(formatCommand(alias, "")),
      });
    } catch (error) {
      res.add({
        title: "Unexpected Error",
        subtitle: `${error}`,
        jsonRPCAction: Flow.Actions.changeQuery(
          formatCommand(alias, fromAddr, toAddr, amountStr)
        ),
      });
    }
  }
);