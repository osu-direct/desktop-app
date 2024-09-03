import * as path from "path";
import { runFile, runFileDetached } from "./execUtil";
import { app } from "electron";

const isDev = "ELECTRON_IS_DEV" in process.env || !app.isPackaged;

export const VolPath = isDev
  ? path.join(
    app.getAppPath(),
    "..",
    "assets",
    "SetVol.exe",
  )
  : path.join(
    app.getAppPath(),
    "..",
    "..",
    "assets",
    "SetVol.exe",
  );

export const muteApp = (app: string) => {
  runFile(path.dirname(VolPath), path.basename(VolPath), [
    "mute",
    "appaudio",
    app,
  ]);
};

export const unmuteApp = (app: string) => {
  runFile(path.dirname(VolPath), path.basename(VolPath), [
    "unmute",
    "appaudio",
    app,
  ]);
};

export const easeAppVolume = (app: string, volume: number, seconds: number) => {
  runFileDetached(path.dirname(VolPath), path.basename(VolPath), [
    volume.toFixed(),
    "over",
    seconds.toFixed(),
    "appaudio",
    app,
  ]);
};
