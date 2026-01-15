// ========================================
// RESOURCES - Gestion des configs & assets
// ========================================

const fs = require('fs');
const path = require('path');
const { downloadFile, downloadJson, calculateFileHash } = require('./downloader');
const { getMinecraftPath } = require('./minecraft');

/**
 * Récupère le chemin des données du launcher
 */
function getLauncherDataPath() {
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');
    const launcherPath = path.join(appData, 'CobblemonOfTheWildLauncher');
    if (!fs.existsSync(launcherPath)) {
        fs.mkdirSync(launcherPath, { recursive: true });
    }
    return launcherPath;
}

/**
 * Télécharge et synchronise les ressources (configs, shaders, etc.)
 * @param {string} resourcesUrl - URL du manifeste des ressources
 * @param {function} onProgress - Callback de progression
 */
async function downloadResources(resourcesUrl, onProgress) {
    if (!resourcesUrl || resourcesUrl.trim() === '') {
        console.log('[RESOURCES] Aucune URL de ressources configurée, téléchargement ignoré.');
        return;
    }

    const mcPath = getMinecraftPath();
    const launcherPath = getLauncherDataPath();
    console.log(`[RESOURCES] Synchronisation des ressources...`);

    try {
        onProgress({ status: 'Vérification des ressources...', percent: 90 });
        const resources = await downloadJson(resourcesUrl);

        if (!Array.isArray(resources)) {
            console.error('[RESOURCES] Manifeste invalide (pas un tableau)');
            return;
        }

        console.log(`[RESOURCES] ${resources.length} fichiers à vérifier.`);

        let processed = 0;
        for (const res of resources) {
            // Choix du dossier de destination (Minecraft ou Launcher)
            const baseDir = res.target === 'launcher' ? launcherPath : mcPath;
            const destPath = path.join(baseDir, res.path);
            const destDir = path.dirname(destPath);

            // Créer les dossiers parents
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            const needsDownload = await resourceNeedsUpdate(res, destPath);

            if (needsDownload) {
                console.log(`[RESOURCES] Téléchargement de ${res.name} vers ${res.path}`);
                onProgress({
                    status: `Ressource: ${res.name}...`,
                    percent: 90 + (processed / resources.length) * 5
                });

                try {
                    await downloadFile(res.url, destPath, () => { });

                    // Vérification hash après download
                    if (res.hash) {
                        const dlHash = await calculateFileHash(destPath);
                        if (dlHash !== res.hash) {
                            console.error(`[RESOURCES] Erreur de hash pour ${res.name}. Suppression.`);
                            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                        }
                    }
                } catch (err) {
                    console.error(`[RESOURCES] Échec de téléchargement pour ${res.name}:`, err);
                }
            }
            processed++;
        }

        onProgress({ status: 'Ressources à jour !', percent: 95 });

    } catch (error) {
        console.error('[RESOURCES] Erreur lors de la synchronisation:', error);
    }
}

/**
 * Vérifie si une ressource doit être mise à jour
 * @param {object} res - Info ressource
 * @param {string} destPath - Chemin local
 */
async function resourceNeedsUpdate(res, destPath) {
    // Si forceOverwrite est activé, toujours télécharger
    if (res.forceOverwrite) {
        console.log(`[RESOURCES] Force overwrite activé pour ${res.name}`);
        return true;
    }

    if (!fs.existsSync(destPath)) return true;

    if (res.hash) {
        const currentHash = await calculateFileHash(destPath);
        return currentHash !== res.hash;
    }

    return false;
}

module.exports = {
    downloadResources,
    getLauncherDataPath
};
