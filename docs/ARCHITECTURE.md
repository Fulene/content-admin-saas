# Architecture

## Objectif

`blog-admin-kit` fournit un socle technique réutilisable pour intégrer, plus tard, un module d'administration de blog dans plusieurs landing pages Next.js.

Cette étape ne contient aucune fonctionnalité métier. Le projet prépare uniquement l'environnement, les conventions et les points d'extension.

## Structure des dossiers

```txt
src/
├── app/
├── components/
├── features/
│   ├── articles/
│   │   ├── services/
│   │   └── types/
│   └── auth/
│       ├── services/
│       └── types/
├── lib/
│   ├── env/
│   ├── supabase/
│   └── utils/
├── types/
└── proxy.ts
```

## Conventions

- `app/` contient uniquement les routes Next.js App Router, les layouts et les pages.
- `features/` contient la logique métier future, organisée par domaine fonctionnel.
- `lib/` contient l'infrastructure technique partagée: environnement, clients externes et utilitaires.
- `components/` est réservé aux composants React transverses sans logique métier propre.
- `types/` est réservé aux types globaux partagés.
- L'alias `@/*` pointe vers `src/*`.

## Rôle de `app/`

`app/` est la couche de routage. Elle doit rester fine et déléguer la logique métier aux modules placés dans `features/`.

## Rôle de `features/`

`features/` regroupera les futures capacités métier du kit, par exemple `articles` et `auth`. Chaque feature peut contenir ses services, types et composants internes si nécessaire.

## Rôle de `lib/`

`lib/` regroupe les dépendances techniques partagées. Les clients Supabase et la validation des variables d'environnement y sont centralisés pour éviter la duplication.

## Stratégie de réutilisation

Le kit doit rester modulaire. Les landing pages consommatrices pourront intégrer les dossiers utiles sans dépendre d'un backoffice complet imposé. Les futures fonctionnalités seront ajoutées dans `features/`, tandis que `app/` restera spécifique aux routes exposées par chaque projet hôte.
