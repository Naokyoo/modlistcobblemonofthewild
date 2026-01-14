# Fichiers de Ressources - Cobblemon of the Wild

Ce dossier contient les ressources qui seront automatiquement téléchargées et synchronisées par le launcher.

## Structure

```
github-mods/
├── resources.json              # Manifeste des fichiers à distribuer
└── resourcepacks/
    └── cobblemon_launcher/
        ├── pack.mcmeta         # Métadonnées du resource pack
        └── assets/
            └── minecraft/
                └── texts/
                    └── splashes.txt  # Textes aléatoires du menu
```

## Fichiers

### resources.json
Manifeste JSON qui liste tous les fichiers à télécharger. **Ce fichier doit être hébergé sur GitHub à :**
`https://raw.githubusercontent.com/Naokyoo/modlistcobblemonofthewild/master/resources.json`

### pack.mcmeta
Métadonnées du resource pack personnalisé pour le launcher.

### splashes.txt
Liste de textes courts en français qui apparaissent aléatoirement à côté du logo Minecraft dans le menu.

## Déploiement

1. **Commiter les fichiers** :
   ```bash
   git add github-mods/
   git commit -m "Mise à jour des ressources du launcher"
   ```

2. **Pousser sur GitHub** :
   ```bash
   git push origin master
   ```

3. **Le launcher téléchargera automatiquement** les fichiers depuis `resources.json` lors du prochain lancement.

## Modification des messages

Pour modifier les messages d'accueil :

1. Éditez `github-mods/resourcepacks/cobblemon_launcher/assets/minecraft/texts/splashes.txt`
2. Committez et poussez les changements
3. Le launcher synchronisera automatiquement les modifications au prochain lancement
