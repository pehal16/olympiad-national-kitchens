const { app, BrowserWindow, Menu, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const net = require("net");
const http = require("http");

const APP_TITLE = "Олимпиада: Национальные кухни мира";

function getBundledRoot() {
  return app.getAppPath();
}

function ensureSeedDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!fs.existsSync(sourceDir)) {
    return;
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      ensureSeedDirectory(sourcePath, targetPath);
      continue;
    }

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function prepareRuntimeDirectories() {
  const bundledRoot = getBundledRoot();
  const runtimeRoot = path.join(app.getPath("userData"), "runtime");
  const dataDir = path.join(runtimeRoot, "data");
  const configDir = path.join(runtimeRoot, "config");
  const storageDir = path.join(runtimeRoot, "storage");
  const exportsDir = path.join(runtimeRoot, "exports");

  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(exportsDir, { recursive: true });

  ensureSeedDirectory(path.join(bundledRoot, "data"), dataDir);
  ensureSeedDirectory(path.join(bundledRoot, "config"), configDir);

  process.env.DATA_DIR = dataDir;
  process.env.CONFIG_DIR = configDir;
  process.env.STORAGE_DIR = storageDir;
  process.env.EXPORTS_DIR = exportsDir;
  process.env.HOST = "127.0.0.1";

  return { runtimeRoot, dataDir, configDir, storageDir, exportsDir };
}

function getFreePort(startPort = 3100) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const tester = net.createServer();
      tester.once("error", () => tryPort(port + 1));
      tester.once("listening", () => {
        tester.close(() => resolve(port));
      });
      tester.listen(port, "127.0.0.1");
    };

    try {
      tryPort(startPort);
    } catch (error) {
      reject(error);
    }
  });
}

function waitForServer(port, attempts = 60) {
  return new Promise((resolve, reject) => {
    let remaining = attempts;

    const ping = () => {
      const request = http.get(
        {
          hostname: "127.0.0.1",
          port,
          path: "/api/health",
          timeout: 1500
        },
        (response) => {
          response.resume();
          if (response.statusCode === 200) {
            resolve();
            return;
          }

          if (remaining <= 0) {
            reject(new Error("Локальный сервер не ответил корректно."));
            return;
          }

          remaining -= 1;
          setTimeout(ping, 500);
        }
      );

      request.on("error", () => {
        if (remaining <= 0) {
          reject(new Error("Не удалось дождаться запуска локального сервера."));
          return;
        }

        remaining -= 1;
        setTimeout(ping, 500);
      });

      request.on("timeout", () => {
        request.destroy();
      });
    };

    ping();
  });
}

function createAppMenu(baseUrl, mainWindow) {
  const template = [
    {
      label: "Олимпиада",
      submenu: [
        {
          label: "Участник",
          click: () => mainWindow.loadURL(`${baseUrl}/`)
        },
        {
          label: "Админка",
          click: () => mainWindow.loadURL(`${baseUrl}/admin.html`)
        },
        {
          label: "Банк заданий",
          click: () => mainWindow.loadURL(`${baseUrl}/content-admin.html`)
        },
        { type: "separator" },
        { role: "reload", label: "Обновить" },
        { role: "toggledevtools", label: "Инструменты разработчика" },
        { type: "separator" },
        { role: "quit", label: "Выход" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createMainWindow() {
  const port = await getFreePort(3100);
  process.env.PORT = String(port);
  prepareRuntimeDirectories();

  require("./server");
  await waitForServer(port);

  const baseUrl = `http://127.0.0.1:${port}`;

  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 780,
    autoHideMenuBar: false,
    title: APP_TITLE,
    backgroundColor: "#f3f7f4",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  createAppMenu(baseUrl, mainWindow);
  await mainWindow.loadURL(`${baseUrl}/`);
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((error) => {
      console.error(error);
      app.quit();
    });
  }
});
