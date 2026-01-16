const { app, BrowserWindow, ipcMain, shell, autoUpdater, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { launch } = require('./launcher/launcher');
const fs = require('fs');

// Interception des logs pour la console de diagnostic
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function sendToRenderer(type, args) {
  const msg = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('main-log', { type, msg });
  });
}

console.log = (...args) => {
  originalLog.apply(console, args);
  sendToRenderer('log', args);
};
console.error = (...args) => {
  originalError.apply(console, args);
  sendToRenderer('error', args);
};
console.warn = (...args) => {
  originalWarn.apply(console, args);
  sendToRenderer('warn', args);
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Configuration du launcher
const CONFIG = {
  serverName: 'Cobblemon Of The Wild',
  serverIp: '91.197.6.29',
  serverPort: 22897,
  autoConnect: true, // Si vrai, le jeu se connecte directement au serveur
  minecraftVersion: '1.21.1', // Version Fabric Cobblemon
  fabricVersion: 'latest',
  discordLink: 'https://discord.gg/68QG8PsgnA',
  websiteLink: 'https://cobblemon.fr', // À modifier
  modsUrl: 'https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/main/mods.json',
  resourcesUrl: 'https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/main/resources.json',
  updateUrl: 'https://github.com/Naokyoo/modlistcobblemonofthewild/releases/latest/download'
};

// Configuration de l'auto-updater (uniquement en prod)
if (app.isPackaged) {
  autoUpdater.setFeedURL({ url: feedURL });

  autoUpdater.on('checking-for-update', () => {
    console.log('[UPDATE] Vérification des mises à jour en cours...');
    sendToRenderer('update-status', [{ status: 'checking', message: 'Recherche de mise à jour...' }]);
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[UPDATE] Mise à jour trouvée !', info);
    sendToRenderer('update-status', [{ status: 'available', message: 'Téléchargement de la mise à jour...' }]);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[UPDATE] Aucune mise à jour disponible (déjà à jour).', info);
    sendToRenderer('update-status', [{ status: 'up-to-date', message: 'Application à jour' }]);
  });

  autoUpdater.on('error', (err) => {
    console.error('[UPDATE] ERREUR AUTO-UPDATER :', err.message);
    console.error('[UPDATE] Détails:', err);
    sendToRenderer('update-status', [{ status: 'error', message: 'Erreur de mise à jour' }]);
  });

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    console.log('[UPDATE] Mise à jour téléchargée avec succès !');
    const dialogOpts = {
      type: 'info',
      buttons: ['Redémarrer', 'Plus tard'],
      title: 'Mise à jour disponible',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'Une nouvelle version a été téléchargée. Redémarrez l\'application pour l\'appliquer.'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) {
        console.log('[UPDATE] Redémarrage pour installation...');
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Vérifier toutes les 10 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 600000);

  // Vérification immédiate au démarrage
  setTimeout(() => {
    console.log('[UPDATE] Lancement de la vérification initiale (Feed URL: ' + feedURL + ')');
    try {
      autoUpdater.checkForUpdates();
    } catch (e) {
      console.error('[UPDATE] Échec critique du checkForUpdates:', e);
    }
  }, 2000);
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    frame: false,
    transparent: false,
    resizable: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

function setupIpcHandlers() {
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('get-config', () => {
    return CONFIG;
  });

  ipcMain.handle('get-server-status', async () => {
    try {
      const { pingServer } = require('./launcher/server-status');
      const response = await pingServer(CONFIG.serverIp, CONFIG.serverPort);
      return response;
    } catch (error) {
      return {
        online: false,
        players: { online: 0, max: 0 },
        version: 'N/A'
      };
    }
  });

  ipcMain.handle('launch-game', async (event, sessionData) => {
    const launcher = require('./launcher/launcher');
    try {
      // Fusionner la config avec les infos de session
      const launchConfig = { ...CONFIG };
      if (sessionData) {
        launchConfig.username = sessionData.username;
        launchConfig.uuid = sessionData.uuid;
        launchConfig.accessToken = sessionData.accessToken;
        launchConfig.userType = sessionData.userType;
      }

      await launcher.launch(launchConfig, (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', progress);
        }
      });

      // Fermer le launcher après 3 secondes si le lancement est réussi
      setTimeout(() => {
        app.quit();
      }, 3000);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('login-microsoft', async () => {
    const { loginMicrosoft } = require('./launcher/auth');
    try {
      const session = await loginMicrosoft();
      return { success: true, session };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('open-mods-folder', () => {
    const { getModsPath } = require('./launcher/mods');
    const modsPath = getModsPath();
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }
    shell.openPath(modsPath);
  });

  ipcMain.handle('get-launcher-path', () => {
    const { getLauncherDataPath } = require('./launcher/resources');
    return getLauncherDataPath();
  });

  ipcMain.handle('read-ui-config', async () => {
    const { getLauncherDataPath } = require('./launcher/resources');
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(getLauncherDataPath(), 'launcher', 'ui-config.json');

    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.error('[IPC] Error reading UI config:', e);
        return null;
      }
    }
    return null;
  });
}

app.whenReady().then(async () => {
  setupIpcHandlers();

  // Initialisation des ressources au démarrage (pour le design dynamique)
  // Ne pas attendre, lancer en arrière-plan avec un timeout
  (async () => {
    try {
      const { downloadResources } = require('./launcher/resources');
      console.log('[MAIN] Téléchargement des ressources de démarrage...');

      // Timeout de 10 secondes max pour les ressources
      await Promise.race([
        downloadResources(CONFIG.resourcesUrl, () => { }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ressources')), 10000)
        )
      ]);

      console.log('[MAIN] Ressources chargées avec succès');
    } catch (err) {
      console.warn('[MAIN] Impossible de charger les ressources:', err.message);
    }
  })();

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
