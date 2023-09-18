import { app, BrowserWindow, dialog, Event, ipcMain, Menu, screen, shell } from "electron";
import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';
import * as path from "path";
import * as fs from 'fs';
import * as configStorage from './configStorage';
import { getFilenameFromHeaders } from "./requestUtil";
/* import { main, shutdown } from "./proxy"; */

app.commandLine.appendSwitch("no-proxy-server");

const isDev = 'ELECTRON_IS_DEV' in process.env || !app.isPackaged;

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow;

setupTitlebar();
configStorage.init();

/* app.on("before-quit", () => shutdown()); */

/* (async () => {
  await main();
})(); */

function createWindow() {

  const windowWidth = 1800;
  const windowHeight = 1000;

  const point = screen.getCursorScreenPoint();
  const { bounds } = screen.getDisplayNearestPoint(point);

  mainWindow = new BrowserWindow({
    titleBarStyle: 'hidden',
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
    if (!url.startsWith("https://osu.direct"))
      shell.openExternal(url);
    return { action: 'deny' }
  })

  mainWindow.setSize(windowWidth, windowHeight);
  mainWindow.center();

  mainWindow.webContents.setUserAgent("osu.direct-desktop");

  mainWindow.webContents.addListener("will-navigate", async (e, i) => {
    if (i.endsWith("/settings")) {
      e.preventDefault();
      //TODO: open settings window
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
        titleBarStyle: 'default',
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
    } else if (i.startsWith("https://osu.direct/api/d/")) {
      e.preventDefault();
      const folder: string = (await configStorage.get("songs_dir") ?? { val: "" }).val as string;
      if (!folder || folder == "") {
        mainWindow.webContents.executeJavaScript(`doAlert('warn', 'You need to set your Downloads Folder first in the Settings.')`);
        return;
      }
      const splittedUrl = i.split("/");
      const setID = splittedUrl.pop();
      console.log("SetID:", setID);
      mainWindow.webContents.executeJavaScript(`doAlert('info', 'Downloading Set: ${setID}')`);
      const fetchResult = await fetch(i, {
        method: "GET",
        mode: "cors"
      });
      if (!fetchResult.ok) {
        mainWindow.webContents.executeJavaScript(`doAlert('error', 'Failed to download Set: ${setID}')`);
        return;
      }
      const headers = fetchResult.headers;
      const filename = getFilenameFromHeaders(headers);
      const fetchBlob = await fetchResult.blob();
      const fetchArrayBuffer = await fetchBlob.arrayBuffer();
      const fetchBuffer = Buffer.from(fetchArrayBuffer);
      console.log(folder, fetchBlob.type);
      if (fetchBlob.type != "application/octet-stream") {
        mainWindow.webContents.executeJavaScript(`doAlert('error', 'Failed to download Set: ${setID}')`);
      }

      await fs.promises.writeFile(path.join(folder, filename), fetchBuffer);
      mainWindow.webContents.executeJavaScript(`doAlert('success', 'Successfully downloaded Set: ${setID}')`);
    }
  });

  ipcMain.handle("browse-folder", async () => {
    const yes = await dialog.showOpenDialog(settingsWindow, {
      properties: ['openDirectory'],
    });
    console.log(yes);
    if (yes.canceled || yes.filePaths.length <= 0) return "";
    return yes.filePaths[0];
  })

  ipcMain.handle("get-folder", async () => {
    const folder: string = (await configStorage.get("songs_dir") ?? { val: "" }).val as string;
    return folder
  })

  ipcMain.on("set-folder", async (_e: Event, folder: string) => {
    configStorage.set("songs_dir", folder)
  })

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show())

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("https://osu.direct/browse");

  if (isDev)
    mainWindow.webContents.openDevTools({ mode: 'detach' });
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
