const fs = require('fs');
const path = require('path');

const filesToFilter = ['resources.json', 'resources-light.json'];
const allowedPrefixes = ['launcher/', 'resourcepacks/', 'shaderpacks/', 'emotes/'];

filesToFilter.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`Fichier non trouvé: ${filename}`);
        return;
    }

    console.log(`Filtrage de ${filename}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const originalCount = data.length;
    const filteredData = data.filter(entry => {
        return allowedPrefixes.some(prefix => entry.path.startsWith(prefix));
    });

    fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 4));
    console.log(`${filename}: ${originalCount} -> ${filteredData.length} entrées.`);
});
