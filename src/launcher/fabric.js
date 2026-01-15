// ========================================
// FABRIC - Installation de Fabric Loader
// ========================================

const fs = require('fs');
const path = require('path');
const { downloadFile, downloadJson } = require('./downloader');
const { getMinecraftPath, getVersionsPath } = require('./minecraft');

// URLs Fabric
const FABRIC_META_URL = 'https://meta.fabricmc.net/v2';

/**
 * Obtient la dernière version de Fabric Loader
 * @returns {Promise<string>}
 */
async function getLatestLoaderVersion() {
    const loaders = await downloadJson(`${FABRIC_META_URL}/versions/loader`);
    const stable = loaders.find(l => l.stable);
    return stable ? stable.version : loaders[0].version;
}

/**
 * Obtient le profil Fabric pour une version
 * @param {string} mcVersion - Version Minecraft
 * @param {string} loaderVersion - Version du loader (optionnel)
 * @returns {Promise<object>}
 */
async function getFabricProfile(mcVersion, loaderVersion = null) {
    if (!loaderVersion) {
        loaderVersion = await getLatestLoaderVersion();
    }

    const url = `${FABRIC_META_URL}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`;
    return await downloadJson(url);
}

/**
 * Vérifie si Fabric est installé pour une version
 * @param {string} mcVersion - Version Minecraft
 * @returns {boolean}
 */
function isFabricInstalled(mcVersion) {
    const fabricVersionId = `fabric-loader-${mcVersion}`;
    const versionPath = path.join(getVersionsPath(), fabricVersionId);
    return fs.existsSync(path.join(versionPath, `${fabricVersionId}.json`));
}

/**
 * Obtient l'ID de version Fabric
 * @param {string} mcVersion - Version Minecraft
 * @param {string} loaderVersion - Version du loader
 * @returns {string}
 */
function getFabricVersionId(mcVersion, loaderVersion) {
    return `fabric-loader-${loaderVersion}-${mcVersion}`;
}

/**
 * Télécharge et installe Fabric
 * @param {string} mcVersion - Version Minecraft
 * @param {function} onProgress - Callback de progression
 * @returns {Promise<object>} - Profil Fabric
 */
async function installFabric(mcVersion, onProgress) {
    onProgress({ status: 'Installation de Fabric...', percent: 82 });

    // Obtenir le profil Fabric
    const loaderVersion = await getLatestLoaderVersion();
    const profile = await getFabricProfile(mcVersion, loaderVersion);

    // Créer le dossier de version
    const versionId = profile.id;
    const versionPath = path.join(getVersionsPath(), versionId);

    if (!fs.existsSync(versionPath)) {
        fs.mkdirSync(versionPath, { recursive: true });
    }

    // Sauvegarder le profil JSON
    const jsonPath = path.join(versionPath, `${versionId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(profile, null, 2));

    onProgress({ status: 'Téléchargement des bibliothèques Fabric...', percent: 85 });

    // Télécharger les bibliothèques Fabric
    const librariesPath = path.join(getMinecraftPath(), 'libraries');
    let downloaded = 0;
    const libraries = profile.libraries;

    for (const lib of libraries) {
        const libPath = mavenToPath(lib.name);
        const fullPath = path.join(librariesPath, libPath);

        // Utiliser l'URL du profil ou le repo Fabric par défaut si absent
        const baseUrl = lib.url || 'https://maven.fabricmc.net/';
        const url = `${baseUrl}${libPath}`;

        if (!fs.existsSync(fullPath)) {
            try {
                await downloadFile(url, fullPath, () => { });
            } catch (e) {
                console.warn(`[FABRIC] Impossible de télécharger ${lib.name} depuis ${url}: ${e.message}`);
            }
        }

        downloaded++;
        onProgress({
            status: `Bibliothèques Fabric (${downloaded}/${libraries.length})`,
            percent: 85 + (downloaded / libraries.length) * 10
        });
    }

    onProgress({ status: 'Fabric installé !', percent: 95 });

    return profile;
}

/**
 * Convertit un nom Maven en chemin de fichier
 * @param {string} name - Nom Maven (group:artifact:version)
 * @returns {string}
 */
function mavenToPath(name) {
    const parts = name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];

    return `${group}/${artifact}/${version}/${artifact}-${version}.jar`;
}

module.exports = {
    getLatestLoaderVersion,
    getFabricProfile,
    isFabricInstalled,
    getFabricVersionId,
    installFabric,
    mavenToPath
};
