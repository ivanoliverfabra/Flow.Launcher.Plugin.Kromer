import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "aliases.json");

export class AliasManager {
  private aliases: Record<string, string> = {};

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(FILE)) {
      this.aliases = JSON.parse(fs.readFileSync(FILE, "utf8"));
    }
  }

  private save() {
    fs.writeFileSync(FILE, JSON.stringify(this.aliases, null, 2), "utf8");
  }

  set(alias: string, address: string) {
    this.aliases[alias] = address;
    this.save();
  }

  delete(alias: string) {
    delete this.aliases[alias];
    this.save();
  }

  resolve(input: string): string {
    return this.aliases[input] || input;
  }

  list(): [string, string][] {
    return Object.entries(this.aliases);
  }
}