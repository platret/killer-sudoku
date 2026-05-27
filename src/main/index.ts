import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import { initDb, getLastError, getDbPath, closeDb } from './db/index';
import { getSetting, setSetting } from './db/queries';
import { runSeed } from './db/seed';
import { registerAuthIpc } from './ipc/auth';
import { registerPuzzleIpc } from './ipc/puzzle';
import { registerSolverIpc } from './ipc/solver';
import { registerResultIpc } from './ipc/result';
import { registerSettingsIpc } from './ipc/settings';
import { registerWindowIpc } from './ipc/window';
import { registerFileIpc } from './ipc/file';
import type { DbStatus } from '@shared/types';

const isDev = !!process.env.ELECTRON_RENDERER_URL;
let mainWindow: BrowserWindow | null = null;
let dbStatus: DbStatus = { ok: false, error: 'Initializing' };

function logoPromptOnce(): void {
  const banner = [
    '────────────────────────────────────────────────────────────',
    'KillerSudoku — logo prompt',
    'A clean, minimal logo for KillerSudoku. A bold 3x3 grid mark',
    'with one accent cell and a small sum-corner numeral.',
    'Style: flat vector, geometric, no gradients, sharp edges.',
    'Primary: #3b82f6   Secondary: #ffffff   Background: transparent',
    'Resolution: 256x256 PNG with transparency.',
    'Save as: src/renderer/assets/icon.png',
    '────────────────────────────────────────────────────────────'
  ].join('\n');
  console.log(banner);
}

function broadcastDb(): void {
  if (!mainWindow) return;
  mainWindow.webContents.send('db:status', dbStatus);
}

interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized?: boolean;
}

function loadBounds(): WindowBounds {
  const fallback: WindowBounds = { width: 1280, height: 800 };
  try {
    const raw = getSetting('window:bounds');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as WindowBounds;
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

function saveBounds(): void {
  if (!mainWindow) return;
  try {
    const b = mainWindow.getBounds();
    const data: WindowBounds = {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      maximized: mainWindow.isMaximized()
    };
    setSetting('window:bounds', JSON.stringify(data));
  } catch {
    /* ignore — DB may be down */
  }
}

async function createWindow(): Promise<void> {
  const bounds = dbStatus.ok ? loadBounds() : { width: 1280, height: 800 };

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 980,
    minHeight: 680,
    show: false,
    frame: false,
    backgroundColor: '#0a0612',
    title: 'KillerSudoku',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (bounds.maximized) mainWindow.maximize();

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    broadcastDb();
    if (isDev) mainWindow?.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, validatedURL) => {
    console.error('[renderer] did-fail-load', code, desc, validatedURL);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[renderer] render-process-gone', details);
  });
  mainWindow.webContents.on('preload-error', (_e, preloadPath, err) => {
    console.error('[preload] error in', preloadPath, err);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  const debounceSave = debounce(saveBounds, 400);
  mainWindow.on('resize', debounceSave);
  mainWindow.on('move', debounceSave);
  mainWindow.on('close', saveBounds);

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let t: NodeJS.Timeout | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function applyCsp(): void {
  const devPolicy =
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*; " +
    "worker-src 'self' blob:;";
  const prodPolicy =
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'; " +
    "worker-src 'self' blob:;";
  const policy = isDev ? devPolicy : prodPolicy;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    });
  });
}

function registerDbIpc(): void {
  ipcMain.handle('db:status', async (): Promise<DbStatus> => dbStatus);
}

async function runSeedMode(): Promise<void> {
  const init = initDb();
  if (!init.ok) {
    console.error('[seed] DB init failed:', init.error);
    app.exit(1);
    return;
  }
  console.log('[seed] DB file:', getDbPath());
  try {
    await runSeed();
    closeDb();
    app.exit(0);
  } catch (e) {
    console.error('[seed] failed:', e instanceof Error ? e.stack ?? e.message : String(e));
    app.exit(1);
  }
}

app.whenReady().then(async () => {
  if (process.argv.some((a) => a === '--seed')) {
    await runSeedMode();
    return;
  }

  logoPromptOnce();
  applyCsp();

  const initResult = initDb();
  dbStatus = initResult.ok
    ? { ok: true }
    : { ok: false, error: initResult.error ?? getLastError() ?? 'Unknown error opening database' };

  if (initResult.ok) {
    console.log('[db] opened at', getDbPath());
  } else {
    console.error('[db] failed to open:', dbStatus.error);
  }

  registerAuthIpc();
  registerPuzzleIpc();
  registerSolverIpc();
  registerResultIpc();
  registerSettingsIpc();
  registerWindowIpc(() => mainWindow);
  registerFileIpc();
  registerDbIpc();

  await createWindow();
  broadcastDb();

  app.on('activate', async () => {
    if (!dbStatus.ok) {
      const r = initDb();
      dbStatus = r.ok
        ? { ok: true }
        : { ok: false, error: r.error ?? getLastError() ?? 'Unknown error opening database' };
    }
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    broadcastDb();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDb();
});

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? '___none___')) {
      event.preventDefault();
    }
  });
});
