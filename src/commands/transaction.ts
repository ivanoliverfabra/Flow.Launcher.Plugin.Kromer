import { FlowActions } from "flow-plugin";
import { Transaction } from "jskromer";
import { cmd, nextPage, previousPage } from "../lib/command.js";
import { arg, formatCommand, formatRelativeTime, Krawlet } from "../lib/utils.js";

export default cmd(
  {
    name: "transaction",
    description: "Check recent transactions for a Kromer wallet",
    usage: formatCommand(
      "transaction",
      `${arg("page", true)} | ${arg("info")} ${arg("txId")}`
    ),
    aliases: ["tx"],
  },
  async (args, response, alias) => {
    const [pageArgOrSubcommand, txId] = args;

    if (pageArgOrSubcommand === "info") {
      if (!txId) {
        response.add({
          title: "Transaction Information",
          subtitle: `Usage: ${formatCommand(alias, "info", arg("txId"))}`,
        });
        return;
      }

      if (Number.isNaN(Number(txId))) {
        response.add({
          title: "Invalid Transaction ID",
          subtitle: "Please provide a valid numeric transaction ID",
        });
        return;
      }

      try {
        const tx = await Transaction.get(Number(txId));
        if (!tx.ok()) {
          response.add({
            title: "Transaction not found",
            subtitle: `Error: ${tx.error()}`,
          });
          return;
        }

        response.add({
          title: `${tx.from.address} → ${tx.to.address} • ${tx.value} KRO`,
          subtitle: `Transaction #${tx.id} • ${formatRelativeTime(tx.time)}`,
          jsonRPCAction: FlowActions.openUrl(Krawlet.Transaction(tx)),
          titleToolTip: 'Open transaction details on Krawlet explorer',
        });

        response.add({
          title: `To ${tx.to.address}`,
          subtitle: "View recipient wallet details",
          jsonRPCAction: FlowActions.changeQuery(formatCommand("w", "info", tx.to.address)),
        });

        response.add({
          title: `From ${tx.from.address}`,
          subtitle: "View sender wallet details",
          jsonRPCAction: FlowActions.changeQuery(formatCommand("w", "info", tx.from.address)),
        });

        return;
      } catch (err: any) {
        response.add({
          title: "Error loading transaction info",
          subtitle: err.message,
        });
        return;
      }
    }

    const page = pageArgOrSubcommand && !isNaN(parseInt(pageArgOrSubcommand, 10))
      ? Math.max(1, parseInt(pageArgOrSubcommand, 10))
      : 1;
    const offset = (page - 1) * 10;

    try {
      const txs = await Transaction.listLatest({ limit: 10, offset });
      if (!txs.ok()) {
        response.add({
          title: "Failed to fetch transactions",
          subtitle: `Error: ${txs.error()}`,
        });
        return;
      }

      if (txs.count === 0) {
        response.add({
          title: "No transactions found",
          subtitle:
            page > 1
              ? `No transactions on page ${page}`
              : "This wallet has no transactions",
        });
        return;
      }


      txs.transactions.forEach((tx) =>
        response.add({
          title: `${tx.from.address} → ${tx.to.address}`,
          subtitle: `${tx.value} KRO • Transaction #${tx.id} • ${new Date(
            tx.time
          ).toLocaleString()}`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, "info", `${tx.id}`)),
          titleToolTip: 'View detailed transaction information',
        })
      );

      if (page > 1) {
        response.add(
          previousPage({
            subtitle: `View transactions on page ${page - 1}`,
            jsonRPCAction: FlowActions.changeQuery(
              formatCommand(alias, `${page - 1}`)
            ),
          })
        );
      }
      if (txs.total > txs.count + offset) {
        response.add(
          nextPage({
            subtitle: `View transactions on page ${page + 1}`,
            jsonRPCAction: FlowActions.changeQuery(
              formatCommand(alias, `${page + 1}`)
            ),
          })
        );
      }
    } catch (err: any) {
      response.add({ title: "Error", subtitle: err.message });
    }
  }
);