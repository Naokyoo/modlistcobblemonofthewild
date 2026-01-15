// ========================================
// MINECRAFT - Téléchargement de Minecraft
// ========================================

const fs = require('fs');
const path = require('path');
const { downloadFile, downloadJson } = require('./downloader');
const { getLauncherPath } = require('./java');

// URLs des manifestes Mojang
const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

/**
 * Obtient le chemin du dossier Minecraft
 * @returns {string}
 */
function getMinecraftPath() {
    return path.join(getLauncherPath(), 'minecraft');
}

/**
 * Obtient le chemin du dossier versions
 * @returns {string}
 */
function getVersionsPath() {
    return path.join(getMinecraftPath(), 'versions');
}

/**
 * Vérifie si une version est installée
 * @param {string} version - Version de Minecraft
 * @returns {boolean}
 */
function isVersionInstalled(version) {
    const versionPath = path.join(getVersionsPath(), version);
    const jarPath = path.join(versionPath, `${version}.jar`);
    const jsonPath = path.join(versionPath, `${version}.json`);
    return fs.existsSync(jarPath) && fs.existsSync(jsonPath);
}

/**
 * Télécharge les informations de version depuis Mojang
 * @param {string} version - Version de Minecraft
 * @returns {Promise<object>}
 */
async function getVersionInfo(version) {
    const manifest = await downloadJson(VERSION_MANIFEST_URL);
    const versionEntry = manifest.versions.find(v => v.id === version);

    if (!versionEntry) {
        throw new Error(`Version ${version} non trouvée`);
    }

    return await downloadJson(versionEntry.url);
}

/**
 * Télécharge les bibliothèques Minecraft
 * @param {object} versionInfo - Infos de version
 * @param {function} onProgress - Callback de progression
 */
async function downloadLibraries(versionInfo, onProgress) {
    const librariesPath = path.join(getMinecraftPath(), 'libraries');
    const libraries = versionInfo.libraries.filter(lib => {
        // Filtrer les bibliothèques selon l'OS
        if (!lib.rules) return true;

        for (const rule of lib.rules) {
            if (rule.action === 'allow') {
                if (!rule.os) return true;
                if (rule.os.name === getOsName()) return true;
            }
            if (rule.action === 'disallow') {
                if (rule.os && rule.os.name === getOsName()) return false;
            }
        }
        return false;
    });

    let downloaded = 0;
    const total = libraries.length;

    for (const lib of libraries) {
        if (lib.downloads && lib.downloads.artifact) {
            const artifact = lib.downloads.artifact;
            const libPath = path.join(librariesPath, artifact.path);

            if (!fs.existsSync(libPath)) {
                await downloadFile(artifact.url, libPath, () => { });
            }
        }

        downloaded++;
        onProgress({
            status: `Téléchargement des bibliothèques (${downloaded}/${total})`,
            percent: 30 + (downloaded / total) * 30
        });
    }
}

/**
 * Télécharge les assets Minecraft
 * @param {object} versionInfo - Infos de version
 * @param {function} onProgress - Callback de progression
 */
async function downloadAssets(versionInfo, onProgress) {
    const assetsPath = path.join(getMinecraftPath(), 'assets');
    const indexesPath = path.join(assetsPath, 'indexes');
    const objectsPath = path.join(assetsPath, 'objects');

    // Télécharger l'index des assets
    const assetIndex = versionInfo.assetIndex;
    const indexPath = path.join(indexesPath, `${assetIndex.id}.json`);

    if (!fs.existsSync(indexPath)) {
        if (!fs.existsSync(indexesPath)) {
            fs.mkdirSync(indexesPath, { recursive: true });
        }
        await downloadFile(assetIndex.url, indexPath, () => { });
    }

    // Lire l'index et télécharger les assets
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const objects = Object.values(index.objects);

    let downloaded = 0;
    const total = objects.length;

    for (const obj of objects) {
        const hash = obj.hash;
        const prefix = hash.substring(0, 2);
        const objPath = path.join(objectsPath, prefix, hash);

        if (!fs.existsSync(objPath)) {
            const url = `https://resources.download.minecraft.net/${prefix}/${hash}`;
            await downloadFile(url, objPath, () => { });
        }

        downloaded++;
        if (downloaded % 100 === 0 || downloaded === total) {
            onProgress({
                status: `Téléchargement des assets (${downloaded}/${total})`,
                percent: 60 + (downloaded / total) * 20
            });
        }
    }
}

/**
 * Télécharge Minecraft vanilla
 * @param {string} version - Version à télécharger
 * @param {function} onProgress - Callback de progression
 * @returns {Promise<object>} - Info de version
 */
async function downloadMinecraft(version, onProgress) {
    onProgress({ status: 'Récupération des informations de version...', percent: 5 });

    const versionInfo = await getVersionInfo(version);
    const versionPath = path.join(getVersionsPath(), version);

    if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
    }

    // Sauvegarder le JSON de version
    const jsonPath = path.join(versionPath, `${version}.json`);
    if (!fs.existsSync(jsonPath)) {
        fs.writeFileSync(jsonPath, JSON.stringify(versionInfo, null, 2));
    }

    // Télécharger le client
    onProgress({ status: 'Téléchargement de Minecraft...', percent: 10 });
    const jarPath = path.join(versionPath, `${version}.jar`);

    if (!fs.existsSync(jarPath)) {
        await downloadFile(versionInfo.downloads.client.url, jarPath, (progress) => {
            onProgress({
                status: 'Téléchargement de Minecraft...',
                percent: 10 + (progress.percent * 0.2)
            });
        });
    }

    // Télécharger les bibliothèques
    await downloadLibraries(versionInfo, onProgress);

    // Télécharger les assets
    await downloadAssets(versionInfo, onProgress);

    onProgress({ status: 'Minecraft installé !', percent: 80 });

    return versionInfo;
}

/**
 * Obtient le nom de l'OS pour Mojang
 * @returns {string}
 */
function getOsName() {
    switch (process.platform) {
        case 'win32': return 'windows';
        case 'darwin': return 'osx';
        default: return 'linux';
    }
}

module.exports = {
    getMinecraftPath,
    getVersionsPath,
    isVersionInstalled,
    downloadMinecraft,
    getVersionInfo
};
