# Fichiers de Ressources - Cobblemon of the Wild

Ce dossier contient les ressources qui seront automatiquement téléchargées et synchronisées par le launcher.

## Structure

```
github-mods/
├── resources.json                          # Manifeste des fichiers à distribuer
├── config/
│   └── fancymenu/
│       └── customization/
│           └── cobbleverse_welcome_menu.txt  # Configuration du menu d'accueil
└── resourcepacks/
    └── temp_cobbleverse/
        └── assets/
            └── minecraft/
                └── texts/
                    └── splashes.txt          # Textes aléatoires du menu
```

## Fichiers

### resources.json
Manifeste JSON qui liste tous les fichiers à télécharger. **Ce fichier doit être hébergé sur GitHub à :**
`https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/main/resources.json`

### cobbleverse_welcome_menu.txt
Configuration FancyMenu qui affiche les messages de bienvenue en français sur l'écran titre :
- "BIENVENUE SUR COBBLEMON OF THE WILD" (titre principal)
- Messages de bienvenue et informations pour les joueurs

### splashes.txt
Liste de textes courts en français qui apparaissent aléatoirement à côté du logo Minecraft dans le menu.

## Déploiement

1. **Commiter les fichiers** :
   ```bash
   git add github-mods/
   git commit -m "Ajout des fichiers de personnalisation du menu"
   ```

2. **Pousser sur GitHub** :
   ```bash
   git push origin main
   ```

3. **Le launcher téléchargera automatiquement** les fichiers depuis `resources.json` lors du prochain lancement.

## Modification des messages

Pour modifier les messages d'accueil :

1. Éditez les fichiers localement dans `github-mods/`
2. Committez et poussez les changements
3. Le launcher synchronisera automatiquement les modifications au prochain lancement
