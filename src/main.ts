import {
  app,
  BrowserWindow,
  dialog,
  Event,
  ipcMain,
  Menu,
  screen,
  shell,
  globalShortcut,
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
import { muteApp, unmuteApp } from "./volumeUtil";
import { Window, windowManager } from "node-window-manager";

const gotTheLock = app.requestSingleInstanceLock();

const isDev = "ELECTRON_IS_DEV" in process.env || !app.isPackaged;

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow;
let overlayWindow: BrowserWindow | undefined;
let osuWindow: Window | undefined;

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
  settingsWindow.loadFile(path.join(__dirname, "..", "html", "settings.html"));
  if (isDev) {
    settingsWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function toggleOverlayWindow() {
  const osuTempWindow = windowManager
    .getWindows()
    .find((window) => window.getTitle().startsWith("osu!"));
  if (overlayWindow) {
    mainWindow.showInactive();
    overlayWindow.close();
    overlayWindow = undefined;
    if (osuWindow) {
      osuWindow.restore();
      osuWindow.bringToTop();
      osuWindow = undefined;
    }
    const muteOsuOnPreview = configStorage.get("mute_osu")?.val ?? true;
    if (muteOsuOnPreview) {
      muteApp("osu!");
    }
    globalShortcut.unregister("esc");
    return;
  }

  if (!osuTempWindow) return;

  osuWindow = osuTempWindow;

  const currentDisplay = screen.getDisplayNearestPoint(
    screen.getCursorScreenPoint(),
  );
  const osuWindowBounds = osuWindow.getBounds();

  const isOsuFullscreen =
    osuWindowBounds.x === currentDisplay.bounds.x &&
    osuWindowBounds.y === currentDisplay.bounds.y;

  const nonFullscreenCoordinates = {
    x: osuWindowBounds.x! + 2,
    y: osuWindowBounds.y! + 25,
    width: osuWindowBounds.width! - 4,
    height: osuWindowBounds.height! - 25,
  };

  overlayWindow = new BrowserWindow({
    x: isOsuFullscreen ? 0 : nonFullscreenCoordinates.x,
    y: isOsuFullscreen ? 0 : nonFullscreenCoordinates.y,
    width: isOsuFullscreen
      ? currentDisplay.bounds.width
      : nonFullscreenCoordinates.width,
    height: isOsuFullscreen
      ? currentDisplay.bounds.height
      : nonFullscreenCoordinates.height,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    titleBarStyle: "hidden",
    focusable: true,
    movable: false,
    kiosk: isOsuFullscreen,
    fullscreen: isOsuFullscreen,
    fullscreenable: true,
    webPreferences: {
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "preload_overlay.js"),
      nodeIntegration: true,
    },
  });

  if (isOsuFullscreen) osuWindow.minimize();

  overlayWindow.setAlwaysOnTop(true, "screen-saver", 1);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setMenu(null);

  overlayWindow.webContents.setUserAgent("osu.direct " + version);
  overlayWindow.loadURL("https://osu.direct/browse");

  overlayWindow.webContents.addListener("will-navigate", async (e, i) => {
    if (i.endsWith("/settings")) {
      e.preventDefault();
      openSettings();
    }
  });

  overlayWindow.webContents.on("did-finish-load", () => overlayWindow?.show());

  globalShortcut.register("esc", () => {
    mainWindow.showInactive();
    overlayWindow?.close();
    overlayWindow = undefined;
    if (osuWindow) {
      osuWindow.restore();
      osuWindow.bringToTop();

      osuWindow = undefined;
    }
    const muteOsuOnPreview = configStorage.get("mute_osu")?.val ?? true;
    if (muteOsuOnPreview) {
      muteApp("osu!");
    }
    globalShortcut.unregister("esc");
  });
}

function createWindow() {
  const windowWidth = 1740;
  const windowHeight = 1035;

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

  ipcMain.handle(
    "download",
    async (_e, data: { filename: string; data: ArrayBuffer }) => {
      const tempFolder = path.join(os.tmpdir());
      const osuExecuteable = (await processes()).list.find(
        (process) => process.name == "osu!.exe",
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
      await fs.promises.writeFile(file, new Uint8Array(data.data));
      if (osuExecuteable) {
        const folder = path.dirname(osuExecuteable.path);
        const imported = await runFile(folder, osuExecuteable.path, [file]);
        if (imported && osuWindow && overlayWindow) {
          await new Promise((res) => setTimeout(res, 500));
          overlayWindow.focus();
        }
        return {
          message: imported
            ? "Successfully imported into osu!"
            : "Failed to import into osu!",
          failed: false,
        };
      } else {
        const mapName = data.filename
          .substring(0, data.filename.length - 4)
          .split(" ")
          .splice(1)
          .join(" ");
        return {
          message: `Saved ${mapName}.`,
          failed: false,
        };
      }
    },
  );

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
    const downloadRequest = await fetch("https://osu.direct/download/stable", {
      method: "GET",
      headers: {
        "User-Agent": "osu.direct " + version,
      },
    });
    if (!downloadRequest.ok) {
      return {
        message:
          "Failed to download update, please download manually from website.",
        failed: true,
      };
    }
    const fileArray = await downloadRequest.arrayBuffer();
    await fs.promises.writeFile(osuDirectUpdateFile, new Uint8Array(fileArray));
    runFileDetached(tempFolder, osuDirectUpdateFile);
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

  ipcMain.handle("get-settings", async () => {
    const allSettings = configStorage.getAll();
    return allSettings;
  });

  ipcMain.on("set-folder", async (_e: Event, folder: string) => {
    configStorage.set("songs_dir", folder);
  });

  ipcMain.on("set-osu-mute", async (_e: Event, mute: string) => {
    configStorage.set("mute_osu", mute);
  });

  ipcMain.on("preview-play", async () => {
    const muteOsuOnPreview = configStorage.get("mute_osu")?.val ?? true;
    if (muteOsuOnPreview) {
      muteApp("osu!");
    }
  });

  ipcMain.on("preview-stop", async () => {
    const muteOsuOnPreview = configStorage.get("mute_osu")?.val ?? true;
    if (muteOsuOnPreview) {
      unmuteApp("osu!");
    }
  });

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show());

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("https://osu.direct/browse");

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    globalShortcut.register("f6", () => toggleOverlayWindow());
  });

  app.on("window-all-closed", async () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
