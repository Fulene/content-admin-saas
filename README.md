# Blog Admin Kit

## Description

Socle technique Next.js réutilisable pour un futur module d'administration de blog. Cette base ne contient aucune fonctionnalité métier.

## Installation

```bash
npm install
```

## Lancement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Variables d'environnement

Créer un fichier `.env.local` à partir de `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Architecture

- `src/app/`: routes Next.js App Router.
- `src/features/`: futures fonctionnalités métier isolées par domaine.
- `src/lib/`: infrastructure technique partagée.
- `src/components/`: composants React transverses.
- `src/types/`: types globaux partagés.

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
