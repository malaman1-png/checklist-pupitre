---
name: supabase-preprod-ops
description: Automate Supabase + Railway preprod safely. Use when creating or operating a separate preprod database, applying SQL migrations from scripts/, syncing Railway preprod variables, deploying preprod, and validating the preprod URL without touching production.
---

# Supabase Preprod Ops

## Objectif
Automatiser la preprod de bout en bout, en gardant la prod intacte.

## Regles de securite
- Ne jamais utiliser `main` pour la preprod.
- Ne jamais deployer sur le service Railway `web` (prod).
- Ne jamais utiliser les credentials Supabase prod pour la preprod.
- Arret immediat en cas d'erreur.

## Point d'entree unique
Utiliser seulement:

```bash
./skills/supabase-preprod-ops/scripts/bootstrap-preprod.sh
```

## Cloner les donnees metier prod -> preprod (optionnel)
Utiliser:

```bash
set -a && source ./.env.preprod && set +a
node ./skills/supabase-preprod-ops/scripts/clone-config-data.mjs
```

Par defaut, copie seulement la configuration (categories, materiel, artistes, actes, versions, regles, etc.).
Pour copier aussi les checklists/projets:

```bash
INCLUDE_RUNTIME_DATA=1 node ./skills/supabase-preprod-ops/scripts/clone-config-data.mjs
```

## Prerequis minimaux
- `railway` CLI installe et connecte.
- `curl`, `jq`.
- Fichier `.env.preprod` avec les variables preprod (DB + keys + service).
- Pour cloner les donnees: ajouter `SUPABASE_PROD_URL` et `SUPABASE_PROD_SERVICE_ROLE_KEY` dans `.env.preprod`.

## Procedure executee par bootstrap
1. Charge `.env.preprod`.
2. Verifie que les cibles ne sont pas la prod.
3. Applique les migrations SQL dans `scripts/` (ordre numerique).
4. Verifie l'etat de la base (`verify-preprod.sql`).
5. Synchronise les variables Supabase vers Railway service preprod.
6. Deploie le service preprod.
7. Verifie l'URL et affiche un resume final.

## Action manuelle obligatoire (si pre-requis manquants)
Faire une seule action: completer `.env.preprod`, puis relancer `bootstrap-preprod.sh`.
