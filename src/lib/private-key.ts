import { Wallet } from "jskromer";
import * as keytar from "keytar";
import { SERVICE_NAME } from "./const";

export class PrivateKey {
  constructor(public address: string) { }

  static async get(address: string): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, address);
    } catch (err) {
      console.error("[PrivateKey] Failed to get key:", address, err);
      return null;
    }
  }

  async get(): Promise<string> {
    const privateKey = await PrivateKey.get(this.address);
    if (!privateKey) throw new Error("Private key not found");
    return privateKey;
  }

  async wallet(): Promise<Wallet> {
    const privateKey = await this.get();
    try {
      const wallet = await Wallet.fromPrivateKey(privateKey);
      if (wallet.ok()) return wallet;
      throw new Error(wallet.error());
    } catch (err) {
      console.error("[PrivateKey] Failed to get wallet:", this.address, err);
      throw err;
    }
  }

  static async set(address: string, privateKey: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, address, privateKey);
    } catch (err) {
      console.error("[PrivateKey] Failed to save key:", address, err);
      throw err;
    }
  }

  async set(privateKey: string): Promise<void> {
    return await PrivateKey.set(this.address, privateKey);
  }

  static async delete(address: string): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, address);
    } catch (err) {
      console.error("[PrivateKey] Failed to delete key:", address, err);
      throw err;
    }
  }

  async delete(): Promise<void> {
    return await PrivateKey.delete(this.address);
  }

  async exists(): Promise<boolean> {
    return (await PrivateKey.get(this.address)) !== null;
  }
}