# AGENTS

## Rôle du projet

`content-admin-saas` est un socle technique réutilisable pour ajouter ultérieurement une administration de blog à plusieurs landing pages Next.js.

Le projet ne doit pas contenir de fonctionnalité métier tant que celle-ci n'est pas explicitement demandée.

## Architecture attendue

- `app/` = routes.
- `features/` = logique métier.
- `lib/` = infrastructure technique.

## Conventions de dossiers

- `src/app/` contient les routes, pages et layouts Next.js.
- `src/features/articles/` est réservé aux futures fonctionnalités liées aux articles.
- `src/features/auth/` est réservé aux futures fonctionnalités liées à l'authentification.
- `src/lib/env/` centralise la validation des variables d'environnement.
- `src/lib/supabase/` centralise les clients Supabase.
- `src/lib/utils/` est réservé aux utilitaires techniques partagés.
- `src/components/` est réservé aux composants transverses.
- `src/types/` est réservé aux types globaux.

## Règles de développement

- Ne pas ajouter de page admin, page blog ou route métier sans demande explicite.
- Ne pas ajouter de CRUD, formulaire métier, table SQL, migration SQL, mock ou fichier de démonstration.
- Ne pas ajouter de tests tant que ce n'est pas demandé.
- Ne pas configurer de lint automatique après génération de code.
- Ne pas ajouter Husky, lint-staged, hooks Git ou pre-commit hooks.
- Garder TypeScript en mode strict.
- Utiliser l'alias `@/*` pour les imports depuis `src/`.
- Limiter les recherches larges ou couteuses pour eviter de bloquer la conversation ou IntelliJ par manque de RAM.
- Si une recherche devient trop longue ou trop large, l'arreter et demander des precisions avant de continuer.
- Après plusieurs tentatives de correction ou une phase de debug, nettoyer le code avant de terminer : supprimer les marqueurs temporaires, scripts de diagnostic, fichiers de capture, logs et changements générés sans lien direct avec la correction finale.

## Séparation `app` / `features`

`app/` doit rester une couche de routage fine. La logique métier future doit vivre dans `features/`, organisée par domaine. Les routes peuvent composer les features, mais ne doivent pas devenir le lieu principal de la logique métier.

## Réutilisation du kit

Le kit doit rester portable entre plusieurs projets Next.js. Les dépendances techniques communes restent dans `lib/`, les domaines fonctionnels restent dans `features/`, et les routes exposées restent adaptables au projet hôte.
