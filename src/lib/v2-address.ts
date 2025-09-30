export function isKromerV2Address(address: string, prefix = "k"): boolean {
  const re = new RegExp(`^${prefix}[0-9a-z]{9}$`);
  return re.test(address);
}