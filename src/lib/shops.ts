import Fuse from "fuse.js";
import { Cache } from "./cache.js";
import { getEnchantNbt } from "./enchants.js";

export type RawShop = {
  id: number;
  computerId: number;
  uid: string;
  name: string;
  description: string | null;
  owner: string | null;
  firstSeen: string;
  lastUpdate: string;
  software: string | null;
  actualLocation: string | null;
  actualDimension: number | null;
  location: string | null;
  locationDimension: string | null;
  locationDescription: string | null;
};

export type RawListing = {
  id: number;
  shopId: number;
  name: string;
  description: string | null;
  item: string;
  nbt: string | null;
  hash: string;
  stock: number;
  pricesString: string;
  dynamicPrices: boolean;
  madeOnDemand: boolean;
  shopBuysItem: boolean;
};

export type ListingPrice = {
  id: string;
  value: number;
  currency: string;
  address: string | null;
  requiredMeta: string | null;
};

const BASE_URL = "https://shops.alexdevs.me";
const BLUEMAP_URL = "https://map.reconnected.cc";
const KRAWLET_URL = "https://www.kromer.club";
const zoomFactor = 24;

const Routes = {
  shops: () => `api/Shop/Shops`,
  allItems: () => `api/Shop/Shops/Items`,
  shopByUid: (uid: string) => `api/Shop/Shops/${uid}`,
  shopItems: (uid: string) => `api/Shop/Shops/${uid}/Items`,
  shopItemById: (uid: string, itemId: number) =>
    `api/Shop/Shops/${uid}/Items/${itemId}`,
};

const formatRequestUrl = (
  route: string,
  query?: Record<string, string | number | boolean>
) => {
  const url = new URL(route, BASE_URL);
  if (query) {
    Object.entries(query).forEach(([k, v]) =>
      url.searchParams.append(k, String(v))
    );
  }
  return url.toString();
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fetch failed [${response.status}]: ${response.statusText} on ${url}`
    );
  }
  return response.json();
}

type ListingSortKey = "price" | "stock" | "name";

function sortListings(listings: Listing[], sortBy: ListingSortKey = "price"): Listing[] {
  const sorter: Record<ListingSortKey, (a: Listing, b: Listing) => number> = {
    price: (a, b) => (a.prices[0]?.value ?? Infinity) - (b.prices[0]?.value ?? Infinity),
    stock: (a, b) => b.stock - a.stock,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return listings.sort(sorter[sortBy]);
}

export class Shop {
  private static readonly cache = new Cache<Shop>(5 * 60 * 1000);
  private readonly raw: RawShop;

  constructor(data: RawShop) {
    this.raw = data;
    Shop.cache.set(data.uid, this);
  }

  get id() { return this.raw.id; }
  get uid() { return this.raw.uid; }
  get name() { return this.raw.name; }
  get description() { return this.raw.description; }
  get owner() { return this.raw.owner; }
  get firstSeen() { return new Date(this.raw.firstSeen); }
  get lastUpdate() { return new Date(this.raw.lastUpdate); }
  get location() {
    const [x, y, z] = (this.raw.location ?? this.raw.actualLocation ?? "")
      .split(" ")
      .map((coord) => parseFloat(coord) || 0);
    return {
      location: { x, y, z },
      dimension: this.raw.locationDimension,
      description: this.raw.locationDescription
    };
  }

  get listings() {
    return Listing.getFromCacheByShop(this.raw.uid) ?? [];
  }

  static async ensureCache() {
    if (Shop.cache.entries().length === 0) await this.fetchAll();
  }

  static async fetchAll(force = false): Promise<Shop[]> {
    if (!force && Shop.cache.entries().length > 0) {
      return Shop.cache.entries();
    }

    const data = await fetchJson<RawShop[]>(formatRequestUrl(Routes.shops()));
    const shops = data.map((s) => new Shop(s));

    // warm listings
    await Listing.fetchAll();
    return shops;
  }

  static async fetchByUid(uid: string, force = false): Promise<Shop> {
    const cached = Shop.cache.get(uid);
    if (!force && cached) return cached;

    const data = await fetchJson<RawShop>(
      formatRequestUrl(Routes.shopByUid(uid))
    );
    const shop = new Shop(data);

    await Listing.fetchAllByShopUid(uid);
    return shop;
  }

  static getByUid(uid: string): Shop | null {
    return Shop.cache.get(uid);
  }

  async fetchListings(force = false, sortBy: ListingSortKey = "price"): Promise<Listing[]> {
    if (!force) {
      const cached = Listing.getFromCacheByShop(this.raw.uid, sortBy);
      if (cached) return cached;
    }
    return Listing.fetchAllByShopUid(this.raw.uid, sortBy, force);
  }

  async fetchListingById(itemId: number, force = false): Promise<Listing> {
    return Listing.fetchByShopAndId(this.raw.uid, itemId, force);
  }

  static async search(term: string, force = false): Promise<Shop[]> {
    const shops = await this.fetchAll(force);
    const fuse = new Fuse(shops, {
      keys: ["name", "description", "owner", "location.description"],
      threshold: 0.3,
    });
    return fuse.search(term).map((r) => r.item);
  }

  static async searchByItem(term: string): Promise<Shop[]> {
    const [shops, listings] = await Promise.all([
      this.fetchAll(),
      Listing.fetchAll(),
    ]);
    const shopIndex = new Map<number, Shop>();
    shops.forEach((s) => shopIndex.set(s.id, s));

    const fuse = new Fuse(listings, {
      keys: ["name", "description", "raw.item"],
      threshold: 0.3,
    });
    const searchResults = fuse.search(term).map((r) => r.item);
    const shopMatches = new Set<number>();
    searchResults.forEach((item) => shopMatches.add(item.raw.shopId));

    return [...shopMatches].map((id) => shopIndex.get(id)!).filter(Boolean);
  }

  static matchItem(listings: Listing[], term: string): Listing[] {
    const fuse = new Fuse(listings, {
      keys: ["name", "description", "raw.item"],
      threshold: 0.3,
    });
    return fuse.search(term).map((r) => r.item);
  }

  get mapUrl(): string {
    const { location: { x, y, z } } = this.location;
    return `${BLUEMAP_URL}/#world:${x}:${y}:${z}:${zoomFactor}:0:0:0:1:flat`;
  }

  get krawletUrl(): string {
    const krawletId = this.uid.split(":")[0];
    return `${KRAWLET_URL}/shops/${krawletId}`;
  }

  get totalListings(): number {
    return this.listings?.length ?? 0;
  }

  get totalStock(): number {
    return this.listings?.reduce((sum, item) => sum + item.stock, 0) ?? 0;
  }

  get ownerHeadUrl(): string | undefined {
    if (!this.owner) return undefined;
    return `https://mc-heads.net/head/${this.owner}`;
  }

  toJSON(): RawShop { return this.raw; }
}

export class Listing {
  private static byShop = new Cache<Listing[]>(5 * 60 * 1000);
  private static byId = new Cache<Listing>(5 * 60 * 1000);
  private static allCache = new Cache<Listing[]>(5 * 60 * 1000);

  private readonly _raw: RawListing;
  readonly prices: ListingPrice[];

  constructor(data: RawListing) {
    this._raw = data;
    this.prices = Listing.parsePriceString(data.pricesString).sort(
      (a, b) => a.value - b.value
    );
  }

  get raw() { return this._raw; }
  get id() { return this._raw.id; }
  get shopId() { return this._raw.shopId; }
  get name() { return this._raw.name; }
  get description() { return this._raw.description; }
  get item() { return this._raw.item; }
  get nbt() { return this._raw.nbt ?? getEnchantNbt(this._raw); }
  get hash() { return this._raw.hash; }
  get stock() { return this._raw.stock; }

  private static parsePriceString(priceString: string): ListingPrice[] {
    if (!priceString) return [];
    return priceString
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((price) => {
        const [amount, currency] = price.split(/\s+/);
        const value = parseFloat(amount);
        return {
          id: crypto.randomUUID(),
          value: isNaN(value) ? 0 : value,
          currency: currency ?? "UNKNOWN",
          address: null,
          requiredMeta: null,
        };
      });
  }

  private static indexListings(listings: Listing[], sortBy: ListingSortKey = "price") {
    // reindex maps
    this.byShop.clear();
    this.byId.clear();

    for (const listing of listings) {
      const shopId = listing.raw.shopId.toString();
      const key = `${shopId}:${listing.id}`;
      this.byId.set(key, listing);

      const arr = this.byShop.get(shopId) ?? [];
      arr.push(listing);
      this.byShop.set(shopId, sortListings(arr, sortBy));
    }

    this.allCache.set("all", sortListings(listings, sortBy));
  }

  static async fetchAll(sortBy: ListingSortKey = "price", force = false): Promise<Listing[]> {
    const cached = this.allCache.get("all");
    if (!force && cached) {
      return sortListings([...cached], sortBy);
    }

    const data = await fetchJson<RawListing[]>(formatRequestUrl(Routes.allItems()));
    const listings = data.map((r) => new Listing(r));
    this.indexListings(listings, sortBy);
    return listings;
  }

  static async fetchAllByShopUid(shopUid: string, sortBy: ListingSortKey = "price", force = false): Promise<Listing[]> {
    const cached = this.byShop.get(shopUid);
    if (!force && cached) return sortListings([...cached], sortBy);

    const data = await fetchJson<RawListing[]>(formatRequestUrl(Routes.shopItems(shopUid)));
    const listings = data.map((r) => new Listing(r));
    this.byShop.set(shopUid, sortListings(listings, sortBy));

    for (const l of listings) {
      this.byId.set(`${shopUid}:${l.id}`, l);
    }

    // keep "all" index up to date
    const allCached = this.allCache.get("all") ?? [];
    this.allCache.set("all", sortListings([...allCached, ...listings], sortBy));

    return listings;
  }

  static async fetchByShopAndId(shopUid: string, itemId: number, force = false): Promise<Listing> {
    const cached = this.getFromCacheById(shopUid, itemId);
    if (!force && cached) return cached;
    const data = await fetchJson<RawListing>(
      formatRequestUrl(Routes.shopItemById(shopUid, itemId))
    );
    const listing = new Listing(data);
    this.byId.set(`${shopUid}:${itemId}`, listing);
    return listing;
  }

  static getFromCacheByShop(shopUid: string, sortBy: ListingSortKey = "price"): Listing[] | null {
    const cached = this.byShop.get(shopUid);
    if (!cached) return null;
    return sortListings([...cached], sortBy);
  }

  static getFromCacheById(shopUid: string, itemId: number): Listing | null {
    return this.byId.get(`${shopUid}:${itemId}`) ?? null;
  }

  static async search(term: string, sortBy: ListingSortKey = "price"): Promise<Listing[]> {
    const all = await this.fetchAll(sortBy);
    const fuse = new Fuse(all, {
      keys: ["name", "description", "raw.item"],
      threshold: 0.3,
    });
    return fuse.search(term).map((r) => r.item);
  }

  toJSON(): RawListing {
    return this._raw;
  }

  get iconUrl(): string {
    const [modId, itemName] = this.item.split(":");
    let url = `${BASE_URL}/assets/items/${modId}/${itemName}.png`;
    return url;
  }

  get shop(): Shop | null {
    return Shop.getByUid(this.raw.shopId.toString());
  }

  private static requiresNbt(item: string): boolean {
    return ["minecraft:enchanted_book"].includes(item);
  }

  get krawletUrl(): string {
    const [modId, itemName] = this.item.split(":");
    const url = `${KRAWLET_URL}/shops/items/${modId}/${itemName}`;

    if (Listing.requiresNbt(this.item)) {
      const nbt = getEnchantNbt(this.raw);
      if (nbt) return `${url}?nbt=${nbt}`;
    }

    return url;
  }
}