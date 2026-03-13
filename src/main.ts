import {
  app,
  BrowserWindow,
  dialog,
  Event,
  ipcMain,
  Menu,
  Notification,
  screen,
  shell,
  Tray,
} from "electron";
import {
  attachTitlebarToWindow,
  setupTitlebar,
} from "custom-electron-titlebar/main";
import * as path from "path";
import * as fs from "fs";
import * as configStorage from "./configStorage.js";
import os from "os";
import { processes } from "systeminformation";
import { runFile, runFileDetached } from "./execUtil.js";
import { version } from "./appInfo.js";
import { muteApp, unmuteApp } from "./volumeUtil.js";
import { Window, windowManager } from "node-window-manager";
import { InputState } from "@asdf-overlay/core/input";
import { defaultDllDir, GpuLuid, length, Overlay } from "@asdf-overlay/core";
import { OverlayWindow } from "@asdf-overlay/electron";
import { ElectronOverlaySurface } from "@asdf-overlay/electron/surface";
import { ElectronOverlayInput } from "@asdf-overlay/electron/input";
import { fileURLToPath } from "url";

const gotTheLock = app.requestSingleInstanceLock();

const isDev = "ELECTRON_IS_DEV" in process.env || !app.isPackaged;

let tray: Tray | undefined;

let mainWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow;

let injectedWindow: Window | undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setupTitlebar();
configStorage.init();

console.log(path.join(__dirname, "settings_preload.js"));

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

async function injectOverlay() {
  const osuWindow = windowManager
    .getWindows()
    .find((window) => window.getTitle().startsWith("osu!"));
  if (osuWindow) {
    if (injectedWindow) return;
    injectedWindow = osuWindow;
    const pid = osuWindow.processId;
    const overlay = await Overlay.attach(
      defaultDllDir().replace("app.asar", "app.asar.unpacked"),
      pid,
    );
    const [id, width, height, luid] = await new Promise<
      [number, number, number, GpuLuid]
    >((resolve) =>
      overlay.event.once("added", (id, width, height, luid) =>
        resolve([id, width, height, luid]),
      ),
    );
    const point = screen.getCursorScreenPoint();
    const { displayFrequency } = screen.getDisplayNearestPoint(point);
    const window: OverlayWindow = { id, overlay };
    await overlay.setPosition(id, length(0), length(0));
    await overlay.setAnchor(id, length(0), length(0));
    await overlay.setMargin(id, length(0), length(0), length(0), length(0));

    console.log(displayFrequency);

    let surface: ElectronOverlaySurface | null = null;
    await overlay.listenInput(id, false, true);

    const overlayWindow = new BrowserWindow({
      webPreferences: {
        offscreen: {
          useSharedTexture: true,
          sharedTexturePixelFormat: "argb",
        },
        transparent: true,
        backgroundThrottling: false,
        preload: path.join(__dirname, "preload_overlay.js"),
        nodeIntegration: true,
      },
      show: false,
      opacity: 0.5,
    });
    overlayWindow.setSize(width, height, false);
    overlayWindow.webContents.frameRate = displayFrequency;

    let overlayInput: ElectronOverlayInput | null = null;
    let block = false;

    overlay.event.on("keyboard_input", (_, input) => {
      if (
        input.kind === "Key" &&
        input.state == "Released" &&
        input.key.code === 0x75 &&
        !input.key.extended
      ) {
        block = !block;

        if (block) {
          overlayInput = ElectronOverlayInput.connect(
            window,
            overlayWindow.webContents,
          );
          surface = ElectronOverlaySurface.connect(
            window,
            luid,
            overlayWindow.webContents,
          );
          overlayWindow.webContents.startPainting();
          overlayWindow.webContents.invalidate();
          overlayWindow.focusOnWebView();
          if (isDev) overlayWindow.webContents.openDevTools({ mode: "detach" });
        }
        void overlay.blockInput(id, block);

        return;
      }
    });

    overlay.event.on("input_blocking_ended", () => {
      block = false;
      overlayWindow.webContents.stopPainting();
      overlayWindow.blurWebView();
      void surface?.disconnect().then(() => {
        surface = null;
      });
      void overlayInput?.disconnect().then(() => {
        overlayInput = null;
      });
    });

    overlay.event.on("resized", (windowId, width, height) => {
      if (windowId !== id) {
        return;
      }
      overlayWindow.setSize(width, height);
    });

    overlayWindow.webContents.stopPainting();
    overlayWindow.webContents.setUserAgent("osu.direct-overlay " + version);
    await overlayWindow.loadURL("https://osu.direct/browse");
  } else {
    injectedWindow = undefined;
  }
}

function createWindow() {
  if (mainWindow) {
    mainWindow.restore();
    mainWindow.focus();
    return;
  }
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

  mainWindow.webContents.addListener("will-navigate", async (e, i) => {
    if (i.endsWith("/settings")) {
      e.preventDefault();
      openSettings();
    }
  });

  mainWindow.webContents.on("did-finish-load", () => mainWindow?.show());
  mainWindow.on("close", () => {
    const alreadyMinimized = configStorage.get("minimized");
    if (!alreadyMinimized) {
      new Notification({
        title: "osu.direct Desktop App",
        body: "I am here! Just click the Tray Icon to re-open the app.",
        icon: path.join(__dirname, "..", "assets", "logo.png"),
      }).show();
      configStorage.set("minimized", "true");
    }
    mainWindow = undefined;
  });

  mainWindow.hide();

  attachTitlebarToWindow(mainWindow);

  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadURL("https://osu.direct/browse");

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function registerIPCHandles() {
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
        /* if (imported && osuWindow && overlayWindow) {
          await new Promise((res) => setTimeout(res, 500));
          overlayWindow.focus();
        } */
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
    registerIPCHandles();
    createWindow();

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    tray = new Tray(path.join(__dirname, "..", "assets", "logo.png"));
    const contextMenu = Menu.buildFromTemplate([
      { label: "Show", click: () => createWindow() },
      { role: "quit" },
    ]);
    tray.setToolTip("osu.direct Desktop App");
    tray.on("double-click", () => createWindow());
    tray.setContextMenu(contextMenu);

    setInterval(() => {
      injectOverlay();
    }, 1000);
  });

  app.on("window-all-closed", async () => {
    /* if (process.platform !== "darwin") {
      app.quit();
    } */
  });
}
