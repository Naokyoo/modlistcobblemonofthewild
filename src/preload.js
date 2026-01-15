const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    getConfig: () => ipcRenderer.invoke('get-config'),
    getServerStatus: () => ipcRenderer.invoke('get-server-status'),
    launchGame: (sessionData) => ipcRenderer.invoke('launch-game', sessionData),
    loginMicrosoft: () => ipcRenderer.invoke('login-microsoft'),
    openModsFolder: () => ipcRenderer.invoke('open-mods-folder'),
    onProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => {
            callback(progress);
        });
    },
    onLog: (callback) => {
        ipcRenderer.on('main-log', (event, data) => {
            callback(data);
        });
    },
    getLauncherDataPath: () => ipcRenderer.invoke('get-launcher-path'),
    readUIConfig: () => ipcRenderer.invoke('read-ui-config')
});
