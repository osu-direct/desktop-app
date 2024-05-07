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
import { runFile } from "./execUtil";
/* import { main, shutdown } from "./proxy"; */

app.commandLine.appendSwitch("no-proxy-server");

const isDev = "ELECTRON_IS_DEV" in process.env || !app.isPackaged;

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow;

setupTitlebar();
configStorage.init();

/* app.on("before-quit", () => shutdown()); */

/* (async () => {
  await main();
})(); */

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
  const windowWidth = 1600;
  const windowHeight = 900;

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

  mainWindow.webContents.setUserAgent("osu.direct");

  ipcMain.handle("download", async (_e, data) => {
    const tempFolder = path.join(os.tmpdir());
    const osuExecuteable = (await processes()).list.find((process) =>
      process.name == "osu!.exe"
    );
    let saveFolder = tempFolder;
    if (!osuExecuteable) {
      const folder: string =
        (await configStorage.get("songs_dir") ?? { val: "" })
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
      runFile(folder, osuExecuteable.path, [file]);
      return {
        message: "Importing into osu!...",
        failed: false,
      };
    } else {
      return {
        message: "Saved %s.",
        failed: false,
      };
    }
  });

  mainWindow.webContents.addListener("will-navigate", async (e, i) => {
    console.log(e, i);
    if (i.endsWith("/settings")) {
      e.preventDefault();
      openSettings();
    }
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
    const folder: string = (await configStorage.get("songs_dir") ?? { val: "" })
      .val as string;
    return folder;
  });

  ipcMain.on("set-folder", async (_e: Event, folder: string) => {
    configStorage.set("songs_dir", folder);
  });

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show());

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("http://localhost:5173/browse");

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(async () => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
