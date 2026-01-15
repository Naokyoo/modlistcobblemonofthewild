const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/master/github-mods/';
const BASE_DIR = path.join(__dirname, 'github-mods');

function calculateHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

// 1. GENERATE mods.json
console.log('Generating mods.json...');
const modsDir = path.join(BASE_DIR, 'mods');
const rawModFiles = fs.readdirSync(modsDir);
const modsJson = [];

// Handle split files
const splitBase = 'Cobblemon-fabric-1.7.1+1.21.1.jar';
if (rawModFiles.includes(splitBase + '.part1') && rawModFiles.includes(splitBase + '.part2')) {
    console.log('Found split Cobblemon parts, creating virtual entry...');
    modsJson.push({
        name: 'Cobblemon-fabric-1.7.1-1.21.1',
        filename: splitBase,
        isSplit: true,
        parts: [
            {
                url: GITHUB_BASE_URL + 'mods/' + encodeURIComponent(splitBase + '.part1'),
                hash: calculateHash(path.join(modsDir, splitBase + '.part1'))
            },
            {
                url: GITHUB_BASE_URL + 'mods/' + encodeURIComponent(splitBase + '.part2'),
                hash: calculateHash(path.join(modsDir, splitBase + '.part2'))
            }
        ]
    });
}

// Normal jars
rawModFiles.forEach(file => {
    if (file.endsWith('.jar') && !file.includes('disabled')) {
        const fullPath = path.join(modsDir, file);
        modsJson.push({
            name: file.replace('.jar', ''),
            filename: file,
            url: GITHUB_BASE_URL + 'mods/' + encodeURIComponent(file),
            hash: calculateHash(fullPath)
        });
    }
});

fs.writeFileSync(path.join(BASE_DIR, 'mods.json'), JSON.stringify(modsJson, null, 4));
console.log(`Successfully generated mods.json with ${modsJson.length} mods.`);

// 2. GENERATE resources.json
console.log('Generating resources.json...');
const excludedFiles = ['mods.json', 'resources.json', 'README_RESOURCES.md'];
const allFiles = getAllFiles(BASE_DIR);
const resourcesJson = [];

allFiles.forEach(file => {
    const relativePath = path.relative(BASE_DIR, file).replace(/\\/g, '/');
    const fileName = path.basename(file);

    // Skip if in mods folder or if it's a manifest itself
    if (relativePath.startsWith('mods/') || excludedFiles.includes(fileName)) return;

    const resource = {
        name: fileName,
        path: relativePath,
        url: GITHUB_BASE_URL + relativePath
    };

    // Special cases
    if (relativePath.startsWith('launcher/')) {
        resource.target = 'launcher';
        resource.forceOverwrite = true;
    } else if (relativePath.endsWith('.txt') || relativePath.endsWith('.properties') || relativePath.includes('config/')) {
        resource.forceOverwrite = true;
    }

    resourcesJson.push(resource);
});

fs.writeFileSync(path.join(BASE_DIR, 'resources.json'), JSON.stringify(resourcesJson, null, 4));
console.log(`Successfully generated resources.json with ${resourcesJson.length} resources.`);
