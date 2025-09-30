import { Name, Transaction, Wallet } from "jskromer";

export const formatCommand = (...cmd: string[]) => `kr ${cmd.join(" ")}`;
export const arg = (name: string, isOptional: boolean = false) =>
  isOptional ? `[${name}]` : `<${name}>`;
export const openKrawletUrl = (path: string) => `https://www.kromer.club/${path}`;

export const Krawlet = {
  Transaction: (tx: Transaction) => openKrawletUrl(`transactions/${tx.id}`),
  Wallet: (wallet: Wallet) => openKrawletUrl(`addresses/${wallet.address}`),
  Name: (name: Name) => openKrawletUrl(`addresses/${name.owner}`),
};

export function isValidTransactionId(input: unknown): boolean {
  if (typeof input !== "string" && typeof input !== "number") return false;
  const str = String(input);
  const num = Number(str);
  return Number.isInteger(num) && num > 0 && str === num.toString();
}

interface SuccessResult<T> {
  ok: true;
  value: T;
  error: null;
}

interface ErrorResult {
  ok: false;
  error: string;
  value: null;
}

export function tryCatch<T>(fn: () => T): SuccessResult<T> | ErrorResult {
  try {
    const value = fn();
    return { ok: true, value, error: null };
  } catch (error) {
    return { ok: false, error: String(error), value: null };
  }
}

export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<SuccessResult<T> | ErrorResult> {
  return fn()
    .then((value) => ({ ok: true, value, error: null }) as SuccessResult<T>)
    .catch((error) => ({ ok: false, error: String(error), value: null }) as ErrorResult);
}

export const formatRelativeTime = (past: Date | number): string => {
  const now = new Date();
  const pastDate = past instanceof Date ? past : new Date(past);
  const diffMs = now.getTime() - pastDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths < 12) return `${diffMonths} months ago`;
  return `${diffYears} years ago`;
};