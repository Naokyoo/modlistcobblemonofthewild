# Cobblemon Launcher

Un launcher Minecraft personnalisé pour serveur Cobblemon avec Fabric.

## Prérequis

- [Node.js](https://nodejs.org/) (version LTS recommandée)

## Installation

```bash
# Installer les dépendances
npm install
```

## Lancement (mode développement)

```bash
npm start
```

## Build (créer l'exécutable)

```bash
# Windows
npm run build:win
```

L'exécutable sera créé dans le dossier `dist/`.

## Configuration

Modifiez le fichier `config/launcher-config.json` :

```json
{
    "serverName": "Votre Serveur",
    "serverIp": "play.votreserveur.fr",
    "minecraftVersion": "1.20.1",
    "discordLink": "https://discord.gg/votre-serveur",
    "websiteLink": "https://votreserveur.fr"
}
```

## Ajouter des mods

1. Placez vos mods dans le dossier `%APPDATA%/CobblemonLauncher/minecraft/mods/`
2. Ou configurez une URL de liste de mods dans `launcher-config.json`

### Format de la liste de mods (JSON)

```json
{
    "mods": [
        {
            "name": "Cobblemon",
            "filename": "cobblemon-1.4.1.jar",
            "url": "https://votre-serveur.com/mods/cobblemon-1.4.1.jar",
            "hash": "sha256-hash-optionnel"
        }
    ]
}
```

## Structure du projet

```
LuncherMC/
├── main.js              # Processus principal Electron
├── preload.js           # Bridge sécurisé
├── src/
│   ├── index.html       # Interface
│   ├── styles/          # CSS
│   └── scripts/         # JS frontend
├── launcher/            # Logique du launcher
└── config/              # Configuration
```

## Personnalisation

- **Logo** : Remplacez `src/assets/logo.png`
- **Icône** : Remplacez `src/assets/icon.png` et `icon.ico`
- **Couleurs** : Modifiez les variables CSS dans `src/styles/main.css`

## Licence

MIT
