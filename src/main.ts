import {
  app,
  BrowserWindow,
  dialog,
  Event,
  ipcMain,
  Menu,
  screen,
  shell,
} from "electron";
import {
  attachTitlebarToWindow,
  setupTitlebar,
} from "custom-electron-titlebar/main";
import * as path from "path";
import * as fs from "fs";
import * as configStorage from "./configStorage";
import os from "os";
import { processes } from "systeminformation";
import { runFile, runFileDetached } from "./execUtil";
import { version } from "./appInfo";

const gotTheLock = app.requestSingleInstanceLock();

const isDev = "ELECTRON_IS_DEV" in process.env || !app.isPackaged;

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow;

setupTitlebar();
configStorage.init();

function openSettings() {
  const point = screen.getCursorScreenPoint();
  const { bounds } = screen.getDisplayNearestPoint(point);

  settingsWindow = new BrowserWindow({
    parent: mainWindow,
    x: bounds.x,
    y: bounds.y,
    icon: path.join(__dirname, "..", "assets", "logo.png"),
    modal: true,
    width: 500,
    height: 200,
    title: "Settings",
    type: "dialog",
    minimizable: false,
    maximizable: false,
    resizable: false,
    titleBarStyle: "default",
    frame: true,
    webPreferences: {
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "settings_preload.js"),
      nodeIntegration: true,
    },
  });
  settingsWindow.center();
  settingsWindow.show();
  settingsWindow.loadFile(
    path.join(__dirname, "..", "html", "settings.html"),
  );
}

function createWindow() {
  const windowWidth = 1420;
  const windowHeight = 830;

  const point = screen.getCursorScreenPoint();
  const { bounds } = screen.getDisplayNearestPoint(point);

  mainWindow = new BrowserWindow({
    titleBarStyle: "hidden",
    x: bounds.x,
    y: bounds.y,
    width: windowWidth,
    height: windowHeight,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("https://osu.direct")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.setSize(windowWidth, windowHeight);
  mainWindow.center();

  mainWindow.webContents.setUserAgent("osu.direct " + version);

  ipcMain.handle("download", async (_e, data) => {
    const tempFolder = path.join(os.tmpdir());
    const osuExecuteable = (await processes()).list.find((process) =>
      process.name == "osu!.exe"
    );
    let saveFolder = tempFolder;
    if (!osuExecuteable) {
      const folder: string = (configStorage.get("songs_dir") ?? { val: "" })
        .val as string;
      if (!folder || folder == "") {
        openSettings();
        return {
          message: "Please set your osu! songs directory!",
          failed: true,
        };
      } else {
        saveFolder = folder;
      }
    }
    const file = path.join(saveFolder, data.filename);
    await fs.promises.writeFile(file, Buffer.from(data.data));
    if (osuExecuteable) {
      const folder = path.dirname(osuExecuteable.path);
      const imported = await runFile(folder, osuExecuteable.path, [file]);
      return {
        message: imported
          ? "Successfully imported into osu!"
          : "Failed to import into osu!",
        failed: false,
      };
    } else {
      const mapName = data.filename.substring(0, data.filename.length - 4)
        .split(" ").splice(1).join(" ");
      return {
        message: `Saved ${mapName}.`,
        failed: false,
      };
    }
  });

  mainWindow.webContents.addListener("will-navigate", async (e, i) => {
    if (i.endsWith("/settings")) {
      e.preventDefault();
      openSettings();
    }
  });

  ipcMain.handle("update-client", async () => {
    const tempFolder = os.tmpdir();
    const osuDirectUpdateFile = path.join(
      tempFolder,
      "osu.direct-desktop-update.exe",
    );
    const downloadRequest = await fetch(
      "https://osu.direct/assets/osudirect-desktop.exe",
      {
        method: "GET",
        headers: {
          "User-Agent": "osu.direct " + version,
        },
      },
    );
    if (!downloadRequest.ok) {
      return {
        message:
          "Failed to download update, please download manually from website.",
        failed: true,
      };
    }
    const fileArray = await downloadRequest.arrayBuffer();
    await fs.promises.writeFile(osuDirectUpdateFile, Buffer.from(fileArray));
    await runFileDetached(tempFolder, osuDirectUpdateFile);
    app.quit();
    return {
      message: "Successfully downloaded update.",
      failed: false,
    };
  });

  ipcMain.handle("browse-folder", async () => {
    const openFolderDialog = await dialog.showOpenDialog(settingsWindow, {
      properties: ["openDirectory"],
    });
    if (openFolderDialog.canceled || openFolderDialog.filePaths.length <= 0) {
      return "";
    }
    return openFolderDialog.filePaths[0];
  });

  ipcMain.handle("get-folder", async () => {
    const folder: string = (configStorage.get("songs_dir") ?? { val: "" })
      .val as string;
    return folder;
  });

  ipcMain.handle("get-osu-mute", async () => {
    const osuMute: string = (configStorage.get("osu_mute") ?? { val: "true" })
      .val as string;
    return osuMute == "true";
  });

  ipcMain.on("set-folder", async (_e: Event, folder: string) => {
    configStorage.set("songs_dir", folder);
  });

  ipcMain.handle("set-osu-mute", async (_e: Event, mute: string) => {
    configStorage.set("mute_osu", mute);
  });

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show());

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL(
    isDev ? "http://localhost:5173/browse" : "https://osu.direct/browse",
  );

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}
if (!gotTheLock) {
  app.quit();
} else {
  app.on(
    "second-instance",
    () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    },
  );

  app.whenReady().then(async () => {
    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", async () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
