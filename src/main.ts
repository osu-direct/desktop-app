import { app, BrowserWindow, Menu } from "electron";
import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';
import * as path from "path";

setupTitlebar();

function createWindow() {
  const mainWindow = new BrowserWindow({
    height: 1020,
    width: 1400,
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show())

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("https://osu.direct/browse");

  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
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
