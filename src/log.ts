export function info(message: string): void {
  console.log(`[info] ${message}`);
}

export function warn(message: string, error?: string): void {
  console.warn(`[warn] ${message}${error ? `: ${error}` : ""}`);
}

export function error(message: string, err?: unknown): void {
  console.error(`[error] ${message}`, err);
}
