import { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell } from "electron";
import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main';
import * as path from "path";
import electronReload from "electron-reload";

const isDev = 'ELECTRON_IS_DEV' in process.env || !app.isPackaged;

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow;

setupTitlebar();

ipcMain.handle("browse-folder", async () => {
  const yes = await dialog.showOpenDialog(settingsWindow, {
    properties: ['openDirectory'],
  });
  if (yes.canceled || yes.filePaths.length <= 0) return "";
  return yes.filePaths[0];
})

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

  mainWindow.webContents.addListener("will-navigate", (e, i) => {
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
          preload: path.join(__dirname, "settings_preload.js"),
          nodeIntegration: true,
        },
      });
      settingsWindow.center();
      settingsWindow.show();
      settingsWindow.loadFile(path.join(__dirname, "..", "html", "settings.html"));
    } else if (i.startsWith("https://osu.direct/d/")) {
      //TODO: download handling
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

  mainWindow.webContents.on("did-finish-load", () => mainWindow.show())

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("https://osu.direct/browse");

  if (isDev)
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

if (isDev)
  electronReload(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
  })
