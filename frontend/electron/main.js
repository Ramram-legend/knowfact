/**
 * KnowFact – Electron Main Process
 * Lance le backend Python (PyInstaller) ou uvicorn, puis ouvre la fenêtre.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

// ─── Configuration ──────────────────────────────────────────────────────────
const BACKEND_PORT = 8000;
const BACKEND_URL  = `http://127.0.0.1:${BACKEND_PORT}`;
const HEALTH_URL   = `${BACKEND_URL}/health`;
const IS_DEV       = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let backendProcess = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Résout le chemin d'une ressource embarquée (fonctionne en dev ET packagé). */
function resource(...parts) {
  if (IS_DEV) {
    // En dev, les ressources sont dans le répertoire parent du dossier electron/
    return path.join(__dirname, '..', '..', ...parts);
  }
  // En production, electron-builder copie extraResources dans process.resourcesPath
  return path.join(process.resourcesPath, ...parts);
}

/** Chemin vers le dossier userData (writable) pour la DB SQLite. */
function userDataPath(...parts) {
  return path.join(app.getPath('userData'), ...parts);
}

function isBackendUp() {
  return new Promise((resolve) => {
    http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

/** Attend que le backend réponde sur /health (max 60 s). */
function waitForBackend(timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(HEALTH_URL, (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error('Backend timeout'));
      setTimeout(check, 500);
    };
    check();
  });
}

// ─── Lancement du backend ─────────────────────────────────────────────────────

async function startBackend() {
  // Si un backend tourne déjà sur ce port en dev, on le réutilise
  if (IS_DEV && (await isBackendUp())) {
    console.log('[Electron] Backend déjà actif sur', BACKEND_URL);
    return;
  }

  // S'assurer que le dossier userData et uploads existent
  const dataDir = userDataPath();
  const uploadsDir = userDataPath('uploads');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Chemin de la base de données (writable)
  const dbPath = userDataPath('knowfact.db');

  // Si la DB n'existe pas encore, copier la DB initiale depuis les ressources
  const seedDb = resource('backend', 'knowfact.db');
  if (!fs.existsSync(dbPath) && fs.existsSync(seedDb)) {
    fs.copyFileSync(seedDb, dbPath);
    console.log('[Electron] DB initiale copiée dans userData:', dbPath);
  }

  const env = {
    ...process.env,
    DATABASE_URL: `sqlite:///${dbPath.replace(/\\/g, '/')}`,
    UPLOADS_DIR: uploadsDir,
    PORT: String(BACKEND_PORT),
  };

  if (IS_DEV) {
    // ─── Mode développement : uvicorn en direct ───────────────────────────
    const backendDir = resource('backend');
    console.log('[Electron] Dev – démarrage uvicorn dans', backendDir);

    backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', String(BACKEND_PORT)], {
      cwd: backendDir,
      env,
      stdio: 'pipe',
    });
  } else {
    // ─── Mode production : exécutable PyInstaller ─────────────────────────
    const exePath = resource('backend', 'knowfact-server.exe');
    console.log('[Electron] Prod – démarrage', exePath);

    if (!fs.existsSync(exePath)) {
      dialog.showErrorBox('KnowFact – Erreur', `Backend introuvable :\n${exePath}`);
      app.quit();
      return;
    }

    backendProcess = spawn(exePath, ['--port', String(BACKEND_PORT)], {
      cwd: dataDir,
      env,
      stdio: 'pipe',
      windowsHide: true,
    });
  }

  backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trimEnd()));
  backendProcess.stderr.on('data', (d) => console.error('[Backend ERR]', d.toString().trimEnd()));
  backendProcess.on('exit', (code) => console.log('[Backend] processus terminé avec code', code));
}

function stopBackend() {
  if (!backendProcess) return;
  const pid = backendProcess.pid;
  console.log('[Electron] Arrêt du backend (PID', pid, ')…');
  try {
    if (process.platform === 'win32' && pid) {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      backendProcess.kill();
    }
  } catch (e) {
    // Déjà terminé
  }
  backendProcess = null;
}

// ─── Fenêtre principale ───────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'KnowFact',
    icon: path.join(__dirname, '..', 'public', 'icon.ico'),
    backgroundColor: '#0f172a',
    show: false,  // s'affiche après chargement
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Menu minimal (supprimer la barre par défaut en prod)
  if (!IS_DEV) {
    mainWindow.setMenuBarVisibility(false);
  }

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Cycle de vie de l'app ────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend();

  try {
    console.log('[Electron] En attente du backend…');
    await waitForBackend();
    console.log('[Electron] Backend prêt.');
  } catch (err) {
    dialog.showErrorBox('KnowFact – Erreur de démarrage',
      'Le serveur backend n\'a pas pu démarrer dans le délai imparti.\n' + err.message);
    stopBackend();
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});

// IPC : exposer l'URL backend au renderer si besoin
ipcMain.handle('get-backend-url', () => BACKEND_URL);
