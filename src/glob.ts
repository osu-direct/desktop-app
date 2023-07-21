import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

export const configFolder = path.join(process.platform == "win32" ? process.env['LOCALAPPDATA'] : path.join(process.env['HOME'], ".config"), "osudirect");
if (!fs.existsSync(configFolder)) fs.mkdirSync(configFolder);

export const dbFile = new Database(path.join(configFolder, "osudirect.db"));
dbFile.pragma('journal_mode = WAL');