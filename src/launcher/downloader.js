// ========================================
// DOWNLOADER - Téléchargement de fichiers
// ========================================

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

/**
 * Télécharge un fichier avec progression
 * @param {string} url - URL du fichier
 * @param {string} dest - Chemin de destination
 * @param {function} onProgress - Callback de progression
 * @returns {Promise}
 */
function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        // Créer le dossier parent si nécessaire
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, (response) => {
            // Gérer les redirections (301, 302, 303, 307, 308)
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                file.close();
                try { fs.unlinkSync(dest); } catch (e) { }
                return downloadFile(response.headers.location, dest, onProgress)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Erreur HTTP ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (onProgress && totalSize) {
                    onProgress({
                        downloaded: downloadedSize,
                        total: totalSize,
                        percent: (downloadedSize / totalSize) * 100
                    });
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(dest);
            });
        });

        request.on('error', (err) => {
            fs.unlink(dest, () => { }); // Supprimer le fichier partiel
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

/**
 * Télécharge un fichier JSON
 * @param {string} url - URL du fichier JSON
 * @returns {Promise<object>}
 */
function downloadJson(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, (response) => {
            // Gérer les redirections (301, 302, 303, 307, 308)
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                return downloadJson(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Erreur HTTP ${response.statusCode}`));
                return;
            }

            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    // Supprimer le BOM s'il existe
                    const cleanData = data.replace(/^\ufeff/, '');
                    resolve(JSON.parse(cleanData));
                } catch (e) {
                    console.error('[DOWNLOADER] Erreur parsing JSON:', e);
                    reject(new Error('Erreur parsing JSON'));
                }
            });
        }).on('error', reject);

        // Timeout de 5 secondes
        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Timeout: Le téléchargement a pris trop de temps'));
        });
    });
}

/**
 * Calcule le hash SHA256 d'un fichier
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<string>}
 */
function calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

module.exports = {
    downloadFile,
    downloadJson,
    calculateFileHash
};
