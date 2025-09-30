import { FlowActions } from "flow-plugin";
import { cmd } from "../lib/command.js";
import { Listing, Shop } from "../lib/shops.js";
import { arg, formatCommand } from "../lib/utils.js";

export default cmd(
  {
    name: "shop",
    description: "Browse and search Kromer shops and items",
    aliases: ["s"],
    usage: formatCommand(
      "shop",
      `list | info ${arg("uid")} | items ${arg("uid")} | item ${arg("uid")} ${arg(
        "id"
      )} | search shop ${arg("term")} | search item ${arg(
        "term"
      )} | search shops-by-item ${arg("term")}`
    ),
  },
  async (args, response, alias) => {
    const [subcommand, ...rest] = args;

    if (!subcommand) {
      const commands = [
        { cmd: "list", desc: "Browse all shops" },
        { cmd: "info ", desc: "View shop details" },
        { cmd: "items ", desc: "View all items from a shop" },
        { cmd: "item ", desc: "View a specific item in a shop" },
        { cmd: "search shop ", desc: "Search for shops by keyword" },
        { cmd: "search item ", desc: "Search for items globally" },
        { cmd: "search shops-by-item ", desc: "Find shops that sell a keyword" },
      ];

      commands.forEach(({ cmd, desc }) => {
        response.add({
          title: cmd,
          subtitle: `${desc}`,
          jsonRPCAction: FlowActions.changeQuery(formatCommand(alias, cmd)),
        });
      });
      return;
    }

    // Warm shop cache
    await Shop.ensureCache();

    if (subcommand === "list") {
      const shops = await Shop.fetchAll(false);
      shops.forEach((s) => {
        response.add({
          title: s.name ?? s.uid,
          subtitle: s.description ?? "No description",
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "info", s.uid)
          ),
          icoPath: s.ownerHeadUrl,
        });
      });
      return;
    }

    if (subcommand === "info") {
      const uid = rest[0];
      if (!uid) {
        response.add({
          title: "Usage",
          subtitle: formatCommand(alias, "info", arg("uid")),
        });
        return;
      }
      try {
        const shop = await Shop.fetchByUid(uid, true);
        response.add({
          title: `${shop.name ?? uid}`,
          subtitle: shop.description ?? "",
        });
        response.add({
          title: "Owner",
          subtitle: shop.owner ?? "Unknown",
          icoPath: shop.ownerHeadUrl
        });
        response.add({
          title: "Total Listings",
          subtitle: `x${shop.listings.length} (click to view)`,
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "items", uid)
          ),
        });
        response.add({ title: `Total Stock`, subtitle: `x${shop.totalStock}` });
        response.add({
          title: "Map Location",
          subtitle: "View in Bluemap",
          jsonRPCAction: FlowActions.openUrl(shop.mapUrl),
        });
        response.add({
          title: "View on Krawlet",
          subtitle: "Open in browser",
          jsonRPCAction: FlowActions.openUrl(shop.krawletUrl),
        });
      } catch (err) {
        response.add({ title: "Error", subtitle: String(err) });
      }
      return;
    }

    if (subcommand === "items") {
      const uid = rest[0];
      if (!uid) {
        response.add({
          title: "Usage",
          subtitle: formatCommand(alias, "items", arg("uid")),
        });
        return;
      }
      try {
        const shop = await Shop.fetchByUid(uid, false);
        const items = await shop.fetchListings(false, "price");
        if (items.length === 0) {
          response.add({
            title: "No items",
            subtitle: "This shop has no listings",
          });
          return;
        }
        items.forEach((i) => {
          response.add({
            title: `${i.name} (${i.stock}x)`,
            subtitle: i.prices
              .map((p) => `${p.value} ${p.currency}`)
              .join(", "),
            jsonRPCAction: FlowActions.changeQuery(
              formatCommand(alias, "item", uid, i.id.toString())
            ),
            icoPath: i.iconUrl
          });
        });
      } catch (err) {
        response.add({ title: "Error", subtitle: String(err) });
      }
      return;
    }

    if (subcommand === "item") {
      const [uid, idStr] = rest;
      if (!uid || !idStr) {
        response.add({
          title: "Usage",
          subtitle: formatCommand(alias, "item", arg("uid"), arg("id")),
        });
        return;
      }
      try {
        const shop = await Shop.fetchByUid(uid);
        const item = await shop.fetchListingById(parseInt(idStr), true);
        response.add({
          title: item.name,
          subtitle: item.description ?? "No description",
          icoPath: item.iconUrl
        });
        response.add({ title: "Stock", subtitle: `${item.stock}` });
        response.add({
          title: "Prices",
          subtitle: item.prices
            .map((p) => `${p.value} ${p.currency}`)
            .join(", "),
        });
        response.add({
          title: "View Shop",
          subtitle: "Open shop details",
          jsonRPCAction: FlowActions.changeQuery(
            formatCommand(alias, "info", uid)
          ),
        });
        response.add({
          title: `View ${item.name} on Krawlet`,
          subtitle: `Open in browser ${item.nbt ? "(with NBT)" : ""}`,
          jsonRPCAction: FlowActions.openUrl(item.krawletUrl),
        });
        response.add({
          title: `View ${shop.name} on Krawlet`,
          subtitle: "Open in browser",
          jsonRPCAction: FlowActions.openUrl(shop.krawletUrl),
        });
      } catch (err) {
        response.add({ title: "Error", subtitle: String(err) });
      }
      return;
    }

    if (subcommand === "search") {
      const [mode, ...termParts] = rest;
      const term = termParts.join(" ");
      if (!mode || !term) {
        response.add({
          title: "Usage",
          subtitle: formatCommand(
            alias,
            "search shop|item|shops-by-item",
            arg("term")
          ),
        });
        return;
      }
      try {
        if (mode === "shop") {
          const shops = await Shop.search(term);
          if (shops.length === 0) {
            response.add({ title: "No shops found", subtitle: `for '${term}'` });
            return;
          }
          shops.forEach((s) =>
            response.add({
              title: s.name ?? s.uid,
              subtitle: s.description ?? "",
              jsonRPCAction: FlowActions.changeQuery(
                formatCommand(alias, "info", s.uid)
              ),
            })
          );
        } else if (mode === "item") {
          const items = await Listing.search(term, "price");
          if (items.length === 0) {
            response.add({ title: "No items found", subtitle: `for '${term}'` });
            return;
          }
          items.forEach((i) =>
            response.add({
              title: `${i.name} (${i.stock})`,
              subtitle: i.prices
                .map((p) => `${p.value} ${p.currency}`)
                .join(", "),
              jsonRPCAction: FlowActions.changeQuery(
                formatCommand(alias, "item", i.raw.shopId.toString(), i.id.toString())
              ),
            })
          );
        } else if (mode === "shops-by-item") {
          const shops = await Shop.searchByItem(term);
          if (shops.length === 0) {
            response.add({
              title: "No shops found",
              subtitle: `selling '${term}'`,
            });
            return;
          }
          shops.forEach((s) => {
            const foundItems = Shop.matchItem(s.listings, term);
            const itemList = foundItems
              .map((item) => `${item.name} (${item.stock})`)
              .join(", ");
            response.add({
              title: s.name ?? s.uid,
              subtitle: itemList,
              jsonRPCAction: FlowActions.changeQuery(
                formatCommand(alias, "items", s.uid)
              ),
            });
          });
        } else {
          response.add({
            title: "Unknown search mode",
            subtitle: `Must be "shop", "item", or "shops-by-item"`,
          });
        }
      } catch (err) {
        response.add({
          title: "Error running search",
          subtitle: String(err),
        });
      }
      return;
    }

    response.add({
      title: "Unknown subcommand",
      subtitle: `Run ${formatCommand(alias)} to see available options`,
    });
  }
);