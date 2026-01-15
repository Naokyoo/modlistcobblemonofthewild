const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const modsDir = path.join(__dirname, 'mods-source');
const githubDir = __dirname;
const githubModsDir = path.join(githubDir, 'mods');
const baseUrl = 'https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/main/mods/';

const PART_SIZE = 70 * 1024 * 1024; // 70MB

function calculateHash(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

function calculateBufferHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Nettoyage du dossier mods de destination
console.log('--- Nettoyage du dossier de staging ---');
if (fs.existsSync(githubModsDir)) {
    fs.rmSync(githubModsDir, { recursive: true, force: true });
}
fs.mkdirSync(githubModsDir, { recursive: true });

const modsList = [];
const files = fs.readdirSync(modsDir).filter(f => f.endsWith('.jar'));

console.log(`--- Traitement de ${files.length} mods ---`);

files.forEach(file => {
    const srcPath = path.join(modsDir, file);
    const stats = fs.statSync(srcPath);
    const fullHash = calculateHash(srcPath);

    if (stats.size > PART_SIZE) {
        console.log(`[SPLIT] ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        const buffer = fs.readFileSync(srcPath);
        const parts = [];
        const numParts = Math.ceil(buffer.length / PART_SIZE);

        for (let i = 0; i < numParts; i++) {
            const partBuffer = buffer.slice(i * PART_SIZE, (i + 1) * PART_SIZE);
            const partFileName = `${file}.part${i + 1}`;
            const partPath = path.join(githubModsDir, partFileName);

            fs.writeFileSync(partPath, partBuffer);

            parts.push({
                url: baseUrl + encodeURIComponent(partFileName),
                hash: calculateBufferHash(partBuffer)
            });
        }

        modsList.push({
            name: file.replace('.jar', ''),
            filename: file,
            isSplit: true,
            parts: parts,
            hash: fullHash
        });

    } else {
        console.log(`[COPY] ${file}`);
        fs.copyFileSync(srcPath, path.join(githubModsDir, file));

        modsList.push({
            name: file.replace('.jar', ''),
            filename: file,
            url: baseUrl + encodeURIComponent(file),
            hash: fullHash
        });
    }
});

const manifest = {
    version: "1.1.0",
    mods: modsList
};

fs.writeFileSync(
    path.join(githubDir, 'mods.json'),
    JSON.stringify(manifest, null, 2)
);

console.log('\n--- TERMINÉ ---');
console.log(`Manifeste généré: ${path.join(githubDir, 'mods.json')}`);
console.log(`${modsList.length} mods traités.`);
