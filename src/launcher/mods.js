// ========================================
// MODS - Gestion des mods
// ========================================

const fs = require('fs');
const path = require('path');
const { downloadFile, downloadJson, calculateFileHash } = require('./downloader');
const { getMinecraftPath } = require('./minecraft');

/**
 * Récupère le chemin du dossier mods
 */
function getModsPath() {
    const mcPath = getMinecraftPath();
    const modsPath = path.join(mcPath, 'mods');
    if (!fs.existsSync(modsPath)) {
        fs.mkdirSync(modsPath, { recursive: true });
    }
    return modsPath;
}

/**
 * Télécharge et synchronise les mods
 * @param {string} modsUrl - URL du manifeste des mods
 * @param {function} onProgress - Callback de progression
 */
async function downloadMods(modsUrl, onProgress) {
    if (!modsUrl || modsUrl.trim() === '') {
        console.log('[MODS] Aucune URL de mods configurée, téléchargement ignoré.');
        return;
    }

    const modsPath = getModsPath();
    console.log(`[MODS] Synchronisation des mods...`);

    try {
        onProgress({ status: 'Vérification des mods...', percent: 85 });
        let manifest = await downloadJson(modsUrl);

        // Gérer le format soit Tableau soit Objet { mods: [...] }
        const mods = Array.isArray(manifest) ? manifest : (manifest.mods || []);

        if (!Array.isArray(mods)) {
            console.error('[MODS] Manifeste invalide (pas de liste de mods)');
            return;
        }

        console.log(`[MODS] ${mods.length} mods à vérifier.`);

        // Supprimer les mods qui ne sont plus dans la liste
        await cleanupOldMods(mods, modsPath);

        let processed = 0;
        for (const mod of mods) {
            const fileName = mod.filename || `${mod.name}.jar`;
            const modPath = path.join(modsPath, fileName);

            const needsDownload = await modNeedsUpdate(mod, modPath);

            if (needsDownload) {
                console.log(`[MODS] Téléchargement de ${mod.name}...`);
                onProgress({
                    status: `Mod: ${mod.name}...`,
                    percent: 85 + (processed / mods.length) * 10
                });

                try {
                    if (mod.isSplit && mod.parts) {
                        // Téléchargement des parties
                        console.log(`[MODS] Mod fragmenté détecté: ${mod.name} (${mod.parts.length} parties)`);
                        const partPaths = [];

                        for (let i = 0; i < mod.parts.length; i++) {
                            const part = mod.parts[i];
                            const partPath = `${modPath}.part${i + 1}`;
                            await downloadFile(part.url, partPath, () => { });
                            partPaths.push(partPath);
                        }

                        // Fusion des parties
                        console.log(`[MODS] Fusion des parties pour ${mod.name}...`);
                        const writeStream = fs.createWriteStream(modPath);

                        for (const partPath of partPaths) {
                            const data = fs.readFileSync(partPath);
                            writeStream.write(data);
                            fs.unlinkSync(partPath); // Nettoyage partie
                        }

                        await new Promise(resolve => writeStream.end(resolve));

                    } else {
                        // Téléchargement standard
                        await downloadFile(mod.url, modPath, () => { });
                    }

                    // Vérification hash après download/reconstruction
                    if (mod.hash) {
                        const dlHash = await calculateFileHash(modPath);
                        if (dlHash !== mod.hash) {
                            console.error(`[MODS] Erreur de hash pour ${mod.name}. Suppression.`);
                            if (fs.existsSync(modPath)) fs.unlinkSync(modPath);
                        }
                    }
                } catch (err) {
                    console.error(`[MODS] Échec de téléchargement pour ${mod.name}:`, err);
                }
            }
            processed++;
        }

        onProgress({ status: 'Mods à jour !', percent: 95 });

    } catch (error) {
        console.error('[MODS] Erreur lors de la synchronisation:', error);
    }
}

/**
 * Vérifie si un mod doit être mis à jour
 * @param {object} mod - Info mod
 * @param {string} modPath - Chemin local
 */
async function modNeedsUpdate(mod, modPath) {
    if (!fs.existsSync(modPath)) return true;

    if (mod.hash) {
        const currentHash = await calculateFileHash(modPath);
        return currentHash !== mod.hash;
    }

    return false;
}

/**
 * Nettoie les anciens mods qui ne sont plus dans la liste
 * @param {Array} modsList - Liste des mods actuels
 * @param {string} modsPath - Chemin du dossier mods
 */
async function cleanupOldMods(modsList, modsPath) {
    if (!fs.existsSync(modsPath)) return;

    const files = fs.readdirSync(modsPath);
    const validFileNames = modsList.map(m => m.filename || `${m.name}.jar`);

    for (const file of files) {
        if (file.endsWith('.jar') && !validFileNames.includes(file)) {
            const filePath = path.join(modsPath, file);
            console.log(`[MODS] Suppression du mod obsolète: ${file}`);
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = {
    getModsPath,
    downloadMods
};
