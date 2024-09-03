import { dbFile } from "./glob";
import { Setting } from "./types";

export const init = (): void => {
  dbFile.exec(
    "CREATE TABLE IF NOT EXISTS config (configKey VARCHAR PRIMARY KEY, configValue VARCHAR);",
  );
};

export const set = (key: string, value: string): void => {
  dbFile.prepare(
    `INSERT OR REPLACE INTO config (configKey, configValue) VALUES (?, ?)`,
  ).run(key, value);
};

export const get = (
  key: string,
): Setting | undefined => {
  const result = dbFile.prepare(
    "SELECT configKey key, configValue val FROM config WHERE key = ?",
  ).get(key);
  return result as Setting ?? undefined;
};

export const getAll = (): Setting[] | undefined => {
  const result = dbFile.prepare(
    "SELECT configKey key, configValue val FROM config",
  ).all();
  return result as Setting[] ?? undefined;
};
