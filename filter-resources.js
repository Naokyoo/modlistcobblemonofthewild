const fs = require('fs');

// Lire le fichier complet
const data = JSON.parse(fs.readFileSync('resources-full.json', 'utf8'));

// Ne garder que les fichiers du dossier launcher (pour le design dynamique)
// Exclure: config, datapacks, resourcepacks, shaderpacks, journeymap
const excluded = ['config/', 'datapacks/', 'resourcepacks/', 'shaderpacks/', 'journeymap/'];
const filtered = data.filter(r => !excluded.some(ex => r.path.startsWith(ex)));

console.log('Original:', data.length, 'items');
console.log('Filtered:', filtered.length, 'items (lightweight version)');
console.log('Removed:', (data.length - filtered.length), 'files');

// Afficher ce qui reste
const paths = filtered.map(r => r.path);
const folders = [...new Set(paths.map(p => p.split('/')[0]))];
console.log('\nDossiers conservés:');
folders.forEach(f => {
    const count = paths.filter(p => p.startsWith(f + '/')).length;
    console.log('  ' + f + ': ' + count + ' fichiers');
});

// Sauvegarder le fichier ultra-léger
fs.writeFileSync('resources-light.json', JSON.stringify(filtered, null, 2));
console.log('\nFichier créé: resources-light.json');
