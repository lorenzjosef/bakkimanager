export function requireFirstRow<T>(rows: readonly T[], message: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(message);
  }

  return row;
}
