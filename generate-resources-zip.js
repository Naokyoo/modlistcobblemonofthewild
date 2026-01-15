const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const baseUrl = 'https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/main/';

const resourceItems = [];

// 1. Ajouter le CSS du launcher
const cssPath = 'launcher/custom.css';
if (fs.existsSync(path.join(projectRoot, cssPath))) {
    resourceItems.push({
        name: 'custom.css',
        path: cssPath,
        url: baseUrl + cssPath,
        target: 'launcher',
        forceOverwrite: true
    });
}

// 2. Parcourir les dossiers spécifiques
const foldersToProcess = [
    { dir: 'resourcepacks', filter: (f) => f.endsWith('.zip') },
    { dir: 'shaderpacks', filter: (f) => f.endsWith('.zip') || f.endsWith('.txt') },
    { dir: 'emotes', filter: (f) => f.endsWith('.emotecraft') }
];

foldersToProcess.forEach(({ dir, filter }) => {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) return;

    const files = fs.readdirSync(fullPath).filter(filter);
    files.forEach(file => {
        const relativePath = path.join(dir, file).replace(/\\/g, '/');
        resourceItems.push({
            name: file,
            path: relativePath,
            url: baseUrl + relativePath,
            forceOverwrite: true
        });
    });
});

fs.writeFileSync(
    path.join(projectRoot, 'resources.json'),
    JSON.stringify(resourceItems, null, 4)
);

// Version light (juste le CSS pour le design)
const lightResources = resourceItems.filter(item => item.target === 'launcher');
fs.writeFileSync(
    path.join(projectRoot, 'resources-light.json'),
    JSON.stringify(lightResources, null, 4)
);

console.log(`Manifestes générés avec ${resourceItems.length} entrées !`);
