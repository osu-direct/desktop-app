import { dbFile } from "./glob";


export const init = (): void => {
  dbFile.exec("CREATE TABLE IF NOT EXISTS config (configKey VARCHAR PRIMARY KEY, configValue VARCHAR);");
}

export const set = (key: string, value: string): void => {
  dbFile.prepare(`INSERT OR REPLACE INTO config (configKey, configValue) VALUES (?, ?)`).run(key, value);
}

export const get = async (key: string): Promise<Record<string, string | number> | undefined> => {
  const result = dbFile.prepare("SELECT configKey key, configValue val FROM config WHERE key = ?").get(key);
  return result as Record<string, string | number> ?? undefined;
}