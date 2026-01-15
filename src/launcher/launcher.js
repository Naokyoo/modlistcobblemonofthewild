// ========================================
// LAUNCHER - Lancement de Minecraft
// ========================================

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { getJava } = require('./java');
const { getMinecraftPath, downloadMinecraft, getVersionInfo } = require('./minecraft');
const { installFabric, getFabricProfile, getLatestLoaderVersion } = require('./fabric');
const { downloadMods, getModsPath } = require('./mods');
const { downloadResources } = require('./resources');

/**
 * Lance Minecraft avec Fabric et les mods
 * @param {object} config - Configuration du launcher
 * @param {function} onProgress - Callback de progression
 * @returns {Promise}
 */
async function launch(config, onProgress) {
    try {
        // 1. Vérifier/Installer Java
        onProgress({ status: 'Vérification de Java...', percent: 2 });
        const javaPath = await getJava(onProgress);

        // 2. Télécharger Minecraft
        onProgress({ status: 'Vérification de Minecraft...', percent: 5 });
        const mcVersion = config.minecraftVersion;
        await downloadMinecraft(mcVersion, onProgress);

        // 3. Installer Fabric
        onProgress({ status: 'Installation de Fabric...', percent: 82 });
        const fabricProfile = await installFabric(mcVersion, onProgress);

        // 4. Télécharger les mods
        onProgress({ status: 'Mise à jour des mods...', percent: 96 });
        await downloadMods(config.modsUrl, onProgress);

        // 4b. Télécharger les ressources (FancyMenu/Configs/Packs)
        onProgress({ status: 'Mise à jour des ressources...', percent: 98 });
        await downloadResources(config.resourcesUrl, onProgress);

        // 5. Lancer le jeu
        onProgress({ status: 'Lancement du jeu...', percent: 100 });

        const mcPath = getMinecraftPath();
        const versionsPath = path.join(mcPath, 'versions');

        // Construire les arguments
        const args = await buildArgs(fabricProfile, mcVersion, mcPath, config);

        // Lancer Minecraft
        console.log(`[LAUNCHER] Dossier du jeu: ${mcPath}`);
        console.log(`[LAUNCHER] Arguments: ${args.join(' ')}`);

        const minecraft = spawn(javaPath, args, {
            cwd: mcPath,
            detached: true,
            stdio: 'ignore'
        });

        minecraft.unref();

        return { success: true };

    } catch (error) {
        console.error('Erreur lancement:', error);
        throw error;
    }
}

/**
 * Construit les arguments de lancement
 * @param {object} profile - Profil Fabric
 * @param {string} mcVersion - Version Minecraft
 * @param {string} mcPath - Chemin Minecraft
 * @param {object} config - Configuration
 * @returns {Array<string>}
 */
async function buildArgs(profile, mcVersion, mcPath, config) {
    const librariesPath = path.join(mcPath, 'libraries');
    const versionsPath = path.join(mcPath, 'versions');
    const nativesPath = path.join(mcPath, 'natives', mcVersion);
    const assetsPath = path.join(mcPath, 'assets');

    // Créer dossier natives si nécessaire
    if (!fs.existsSync(nativesPath)) {
        fs.mkdirSync(nativesPath, { recursive: true });
    }

    // Obtenir le classpath
    const classpath = await buildClasspath(profile, mcVersion, librariesPath, versionsPath);

    // Obtenir les infos de version vanilla pour les assets
    const vanillaInfo = await getVersionInfo(mcVersion);

    // Arguments JVM
    const jvmArgs = [
        `-Xmx${config.maxRam || '4G'}`,
        `-Xms${config.minRam || '2G'}`,
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+UseG1GC',
        `-Djava.library.path=${nativesPath}`,
        '-Dminecraft.launcher.brand=CobblemonLauncher',
        '-Dminecraft.launcher.version=1.0.0'
    ];

    // Ajouter les arguments JVM spécifiques à Fabric (ex: -DFabricMcEmu)
    if (profile.arguments && profile.arguments.jvm) {
        profile.arguments.jvm.forEach(arg => {
            // Nettoyer l'argument s'il contient des espaces de padding
            jvmArgs.push(arg.trim());
        });
    }

    // Classpath
    const classpathArg = `-cp`;
    const classpathValue = classpath.join(path.delimiter);

    // Classe principale
    const mainClass = profile.mainClass;

    // Arguments du jeu
    const username = config.username || 'Player';
    const uuid = config.uuid || generateOfflineUUID(username);
    const accessToken = config.accessToken || 'offline';

    const gameArgs = [
        '--username', username,
        '--version', profile.id,
        '--gameDir', mcPath,
        '--assetsDir', assetsPath,
        '--assetIndex', vanillaInfo.assetIndex.id,
        '--uuid', uuid,
        '--accessToken', accessToken,
        '--userType', config.userType || 'msa',
        '--versionType', 'release'
    ];

    // Ajouter l'IP du serveur si l'auto-connexion est activée
    if (config.autoConnect && config.serverIp) {
        gameArgs.push('--server', config.serverIp);
        if (config.serverPort && config.serverPort !== 25565) {
            gameArgs.push('--port', config.serverPort.toString());
        }
    }

    return [...jvmArgs, classpathArg, classpathValue, mainClass, ...gameArgs];
}

/**
 * Construit le classpath complet
 * @param {object} profile - Profil Fabric
 * @param {string} mcVersion - Version Minecraft
 * @param {string} librariesPath - Chemin des bibliothèques
 * @param {string} versionsPath - Chemin des versions
 * @returns {Array<string>}
 */
async function buildClasspath(profile, mcVersion, librariesPath, versionsPath) {
    const classpath = [];

    // Bibliothèques Fabric
    for (const lib of profile.libraries) {
        const libPath = mavenToPath(lib.name);
        const fullPath = path.join(librariesPath, libPath);
        if (fs.existsSync(fullPath)) {
            classpath.push(fullPath);
        } else {
            console.error(`[LAUNCHER] Bibliothèque Fabric manquante: ${lib.name} (${fullPath})`);
        }
    }

    // Bibliothèques vanilla
    const vanillaInfo = await getVersionInfo(mcVersion);
    for (const lib of vanillaInfo.libraries) {
        if (lib.downloads && lib.downloads.artifact) {
            const fullPath = path.join(librariesPath, lib.downloads.artifact.path);
            if (fs.existsSync(fullPath) && !classpath.includes(fullPath)) {
                classpath.push(fullPath);
            }
        }
    }

    // JAR client Minecraft
    const clientJar = path.join(versionsPath, mcVersion, `${mcVersion}.jar`);
    if (fs.existsSync(clientJar)) {
        classpath.push(clientJar);
    }

    return classpath;
}

/**
 * Convertit un nom Maven en chemin
 * @param {string} name - Nom Maven
 * @returns {string}
 */
function mavenToPath(name) {
    const parts = name.split(':');
    const group = parts[0].replace(/\./g, '/');
    const artifact = parts[1];
    const version = parts[2];
    return `${group}/${artifact}/${version}/${artifact}-${version}.jar`;
}

/**
 * Génère un UUID offline pour un username
 * @param {string} username - Nom d'utilisateur
 * @returns {string}
 */
function generateOfflineUUID(username) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
    return `${hash.substr(0, 8)}-${hash.substr(8, 4)}-${hash.substr(12, 4)}-${hash.substr(16, 4)}-${hash.substr(20, 12)}`;
}

module.exports = {
    launch,
    buildArgs,
    buildClasspath
};
