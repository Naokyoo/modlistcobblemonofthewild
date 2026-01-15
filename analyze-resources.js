const fs = require('fs');

const data = JSON.parse(fs.readFileSync('resources-light.json', 'utf8'));
const paths = data.map(r => r.path);
const folders = [...new Set(paths.map(p => p.split('/')[0]))];

console.log('Dossiers principaux:');
folders.forEach(f => {
    const count = paths.filter(p => p.startsWith(f + '/')).length;
    console.log('  ' + f + ': ' + count + ' fichiers');
});
