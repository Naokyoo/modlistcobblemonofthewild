// ========================================
// JAVA - Détection et installation de Java
// ========================================

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');
const { downloadFile } = require('./downloader');
const AdmZip = require('adm-zip');

// Configuration Java
const JAVA_VERSION = '21';
const JAVA_DOWNLOAD_URLS = {
    win32: `https://api.adoptium.net/v3/binary/latest/${JAVA_VERSION}/ga/windows/x64/jre/hotspot/normal/eclipse`,
    darwin: `https://api.adoptium.net/v3/binary/latest/${JAVA_VERSION}/ga/mac/x64/jre/hotspot/normal/eclipse`,
    linux: `https://api.adoptium.net/v3/binary/latest/${JAVA_VERSION}/ga/linux/x64/jre/hotspot/normal/eclipse`
};

/**
 * Obtient le chemin du dossier du launcher
 * @returns {string}
 */
function getLauncherPath() {
    const appData = process.env.APPDATA ||
        (process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Application Support') : os.homedir());
    return path.join(appData, 'CobblemonOfTheWild');
}

/**
 * Obtient le chemin Java du launcher
 * @returns {string}
 */
function getJavaPath() {
    const launcherPath = getLauncherPath();
    const javaDir = path.join(launcherPath, 'java');

    if (process.platform === 'win32') {
        return path.join(javaDir, 'bin', 'java.exe');
    } else {
        return path.join(javaDir, 'bin', 'java');
    }
}

/**
 * Vérifie si Java est installé dans le launcher
 * @returns {boolean}
 */
function isJavaInstalled() {
    const javaPath = getJavaPath();
    return fs.existsSync(javaPath);
}

/**
 * Vérifie la version de Java système
 * @returns {string|null}
 */
function getSystemJavaVersion() {
    try {
        const output = execSync('java -version 2>&1').toString();
        const match = output.match(/version "(\d+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * Télécharge et installe Java
 * @param {function} onProgress - Callback de progression
 * @returns {Promise<string>} - Chemin vers Java
 */
async function installJava(onProgress) {
    const platform = process.platform;
    const downloadUrl = JAVA_DOWNLOAD_URLS[platform];

    if (!downloadUrl) {
        throw new Error(`Plateforme non supportée: ${platform}`);
    }

    const launcherPath = getLauncherPath();
    const javaDir = path.join(launcherPath, 'java');
    const tempZip = path.join(launcherPath, 'java-temp.zip');

    // Créer les dossiers
    if (!fs.existsSync(launcherPath)) {
        fs.mkdirSync(launcherPath, { recursive: true });
    }

    onProgress({ status: 'Téléchargement de Java...', percent: 0 });

    // Télécharger Java
    await downloadFile(downloadUrl, tempZip, (progress) => {
        onProgress({
            status: 'Téléchargement de Java...',
            percent: progress.percent * 0.8 // 80% pour le téléchargement
        });
    });

    onProgress({ status: 'Extraction de Java...', percent: 80 });

    // Extraire le ZIP
    try {
        const zip = new AdmZip(tempZip);
        const entries = zip.getEntries();

        // Trouver le dossier racine (ex: jdk-17.0.1+12-jre)
        const rootFolder = entries[0].entryName.split('/')[0];

        // Créer le dossier java s'il n'existe pas
        if (fs.existsSync(javaDir)) {
            fs.rmSync(javaDir, { recursive: true });
        }

        zip.extractAllTo(launcherPath, true);

        // Renommer le dossier extrait
        const extractedPath = path.join(launcherPath, rootFolder);
        if (fs.existsSync(extractedPath)) {
            fs.renameSync(extractedPath, javaDir);
        }

        // Supprimer le fichier temporaire
        fs.unlinkSync(tempZip);

    } catch (error) {
        throw new Error(`Erreur extraction Java: ${error.message}`);
    }

    onProgress({ status: 'Java installé !', percent: 100 });

    return getJavaPath();
}

/**
 * Obtient un chemin Java valide (système ou launcher)
 * @param {function} onProgress - Callback de progression
 * @returns {Promise<string>}
 */
async function getJava(onProgress) {
    // Vérifier d'abord si Java est installé dans le launcher
    if (isJavaInstalled()) {
        return getJavaPath();
    }

    // Sinon, installer Java
    return await installJava(onProgress);
}

module.exports = {
    getLauncherPath,
    getJavaPath,
    isJavaInstalled,
    getSystemJavaVersion,
    installJava,
    getJava
};
