import keytar from "keytar";

export const SERVICE_NAME = "Flow.Launcher.Plugin.Kromer";

export async function saveKey(address: string, key: string) {
  await keytar.setPassword(SERVICE_NAME, address, key);
}

export async function loadKey(address: string) {
  return await keytar.getPassword(SERVICE_NAME, address);
}

export async function deleteKey(address: string) {
  await keytar.deletePassword(SERVICE_NAME, address);
}

export async function listKeys(): Promise<string[]> {
  const creds = await keytar.findCredentials(SERVICE_NAME);
  return creds.map((c) => c.account);
}

export async function clearKeys() {
  const creds = await keytar.findCredentials(SERVICE_NAME);
  await Promise.all(creds.map((c) => keytar.deletePassword(SERVICE_NAME, c.account)));
}