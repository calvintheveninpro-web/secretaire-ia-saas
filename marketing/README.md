# Page vitrine — Secrétaire IA

Landing page de démonstration (une seule page, sans dépendance) pour présenter et vendre la
Secrétaire IA vocale & écrite.

## Contenu
- `index.html` — page complète (hero, fonctionnement, métiers, configurateur en direct avec
  aperçu d'appel + export JSON de config, tarif unique, FAQ). Aucune installation : ouvrir le
  fichier dans un navigateur.
- `logo-secretaire-ia.svg` — logo (bouclier bleu marine), utilisable à toute taille.

## Ouvrir en local
Double-cliquez sur `index.html`, ou servez le dossier :

```bash
npx serve marketing        # puis ouvrir l'URL affichée
```

## Déploiement
Page statique : déployable tel quel sur Vercel, Netlify, GitHub Pages ou tout hébergement statique.
Le configurateur génère un fichier `smartfr-config-<client>.json` qui alimente le prompt de l'agent
(voir `../prompt/secretaire-ia-prompt.json`).
