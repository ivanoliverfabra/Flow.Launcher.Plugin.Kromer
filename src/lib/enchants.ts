import { RawListing } from "./shops.js";

const enchants = [
  {
    name: "Mending",
    item: "minecraft:enchanted_book",
    nbt: "704a1bcdf9953c791651a77b1fe78891"
  },
  {
    name: "Silk Touch",
    item: "minecraft:enchanted_book",
    nbt: "021f1ac06ec4e4c75d0e0bf67c0712dc"
  },
  {
    name: "Fortune III",
    item: "minecraft:enchanted_book",
    nbt: "bca3a3664a43421d0cfd80de9214d2e5"
  },
  {
    name: "Fire Aspect 2",
    item: "minecraft:enchanted_book",
    nbt: "09ea44e9fa4d954a9c8dcab1e21ca0e6"
  },
  {
    name: "Frost Walker II",
    item: "minecraft:enchanted_book",
    nbt: "9a34ef49ed55d1fc62fbe00f24e2e643"
  },
  {
    name: "Unbreaking III",
    item: "minecraft:enchanted_book",
    nbt: "c752841147c814133f9ba7bca4ebe2de"
  },
  {
    name: "Depth Strider III",
    item: "minecraft:enchanted_book",
    nbt: "cd79cf06631287de78001c53694bc59e"
  },
  {
    name: "Efficiency V",
    item: "minecraft:enchanted_book",
    nbt: "d98a7de081a6256251621aa32fff865a"
  },
  {
    name: "Knockback II",
    item: "minecraft:enchanted_book",
    nbt: "b1d9ad8427e6f9a3c18c485a08f04a8c"
  },
  {
    name: "Infinity",
    item: "minecraft:enchanted_book",
    nbt: "a18fcaf16f4f364615ef05b183fe85c8"
  },
  {
    name: "Protection IV",
    item: "minecraft:enchanted_book",
    nbt: "574661995e9d45223026a14807eedc0c"
  },
  {
    name: "Respiration III",
    item: "minecraft:enchanted_book",
    nbt: "63b43db087e0c7adcc723e67a77c02bc"
  },
  {
    name: "Aqua Affinity",
    item: "minecraft:enchanted_book",
    nbt: "95ff16fd3fd48e66fdb33783a80a08c1"
  }
]

export function getEnchantNbt(item: RawListing): string | null {
  if (item.item !== "minecraft:enchanted_book") return null;
  const enchant = enchants.find(e => e.name.toLowerCase() === item.name.toLowerCase());
  return enchant ? enchant.nbt : null;
}