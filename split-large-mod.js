const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'github-mods', 'mods', 'Cobblemon-fabric-1.7.1+1.21.1.jar');

if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

const stats = fs.statSync(filePath);
console.log(`Splitting ${filePath} (Size: ${stats.size} bytes)...`);

const buffer = fs.readFileSync(filePath);
const partSize = 70 * 1024 * 1024; // 70MB

const part1 = buffer.slice(0, partSize);
const part2 = buffer.slice(partSize);

fs.writeFileSync(filePath + '.part1', part1);
fs.writeFileSync(filePath + '.part2', part2);

fs.unlinkSync(filePath);
console.log('Successfully split into .part1 and .part2, and removed original file.');
