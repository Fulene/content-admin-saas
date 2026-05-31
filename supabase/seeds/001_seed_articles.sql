-- =====================================================
-- BLOG ADMIN KIT
-- Seed Articles
-- 15 articles: 10 published, 5 draft
-- =====================================================

delete from public.articles;

insert into public.articles (
    title,
    slug,
    summary,
    content,
    seo_title,
    seo_description,
    category_name,
    status,
    published_at
)
values
    (
        'Comment créer une landing page performante',
        'comment-creer-landing-page-performante',
        'Les fondamentaux pour concevoir une landing page claire, rapide et orientée conversion.',
        '# Comment créer une landing page performante

      Une landing page efficace doit aller droit au but.

      ## Points clés

      - Message clair
      - CTA visible
      - Preuve sociale
      - Chargement rapide

      Découvrez aussi notre guide sur [l’optimisation SEO d’une landing page](/blog/optimisation-seo-landing-page).',
        'Créer une landing page performante',
        'Guide pratique pour créer une landing page claire, rapide et orientée conversion.',
        'Marketing',
        'published',
        now() - interval '20 days'
    ),
    (
        'Optimisation SEO d’une landing page',
        'optimisation-seo-landing-page',
        'Les bases pour améliorer la visibilité d’une landing page sur Google.',
        '# Optimisation SEO d’une landing page

      Le SEO d’une landing page repose sur une structure propre.

      ## À vérifier

      - Balise title
      - Meta description
      - H1 unique
      - Performance
      - Maillage interne',
        'Optimisation SEO landing page',
        'Découvrez comment optimiser une landing page pour le référencement naturel.',
        'SEO',
        'published',
        now() - interval '18 days'
    ),
    (
        'Pourquoi ajouter un blog à une landing page',
        'pourquoi-ajouter-blog-landing-page',
        'Un blog permet de capter du trafic longue traîne et de renforcer l’autorité du site.',
        '# Pourquoi ajouter un blog à une landing page

      Une landing page seule cible souvent peu de mots-clés.

      Un blog permet de créer des pages complémentaires.

      ## Bénéfices

      - Plus de pages indexables
      - Plus de trafic organique
      - Plus de maillage interne
      - Plus de crédibilité',
        'Pourquoi ajouter un blog à une landing page',
        'Découvrez pourquoi un blog peut renforcer le SEO et la crédibilité d’une landing page.',
        'SEO',
        'published',
        now() - interval '16 days'
    ),
    (
        'Bien structurer un article SEO',
        'bien-structurer-article-seo',
        'Structure, titres, paragraphes et liens internes : les bases d’un article SEO efficace.',
        '# Bien structurer un article SEO

      Un article SEO doit être lisible et bien organisé.

      ## Structure recommandée

      1. Introduction courte
      2. Sections H2
      3. Paragraphes clairs
      4. Liens internes
      5. Conclusion utile',
        'Bien structurer un article SEO',
        'Méthode simple pour structurer un article SEO avec titres, paragraphes et liens internes.',
        'Rédaction',
        'published',
        now() - interval '14 days'
    ),
    (
        'Utiliser Markdown pour rédiger des articles',
        'utiliser-markdown-rediger-articles',
        'Markdown est un format simple, portable et adapté aux contenus SEO.',
        '# Utiliser Markdown pour rédiger des articles

      Markdown permet d’écrire rapidement du contenu structuré.

      ## Avantages

      - Simple à apprendre
      - Facile à relire
      - Compatible avec Next.js
      - Adapté aux liens internes

      Exemple : [bien structurer un article SEO](/blog/bien-structurer-article-seo).',
        'Markdown pour articles SEO',
        'Découvrez pourquoi Markdown est adapté à la rédaction d’articles SEO.',
        'Technique',
        'published',
        now() - interval '12 days'
    ),
    (
        'Créer un maillage interne efficace',
        'creer-maillage-interne-efficace',
        'Le maillage interne aide les visiteurs et les moteurs à comprendre les contenus importants.',
        '# Créer un maillage interne efficace

      Le maillage interne consiste à relier les contenus entre eux.

      ## Bonnes pratiques

      - Utiliser des ancres descriptives
      - Relier les pages importantes
      - Éviter les liens inutiles
      - Mettre à jour les anciens articles',
        'Maillage interne SEO',
        'Apprenez à créer un maillage interne simple et efficace pour améliorer votre SEO.',
        'SEO',
        'published',
        now() - interval '10 days'
    ),
    (
        'Créer un backoffice blog minimaliste',
        'creer-backoffice-blog-minimaliste',
        'Un backoffice efficace doit rester simple : articles, édition, publication et déconnexion.',
        '# Créer un backoffice blog minimaliste

      Un backoffice de blog n’a pas besoin d’être complexe.

      ## Fonctionnalités essentielles

      - Liste des articles
      - Création
      - Modification
      - Suppression
      - Statut brouillon ou publié',
        'Créer un backoffice blog minimaliste',
        'Les fonctionnalités essentielles d’un backoffice simple pour gérer des articles.',
        'Produit',
        'published',
        now() - interval '8 days'
    ),
    (
        'Les avantages du SSR avec Next.js',
        'avantages-ssr-nextjs',
        'Le rendu serveur peut améliorer les performances perçues et l’indexation SEO.',
        '# Les avantages du SSR avec Next.js

      Le SSR permet de générer le HTML côté serveur.

      ## Intérêts

      - Meilleure indexation
      - Chargement initial propre
      - Données disponibles dès le rendu
      - Expérience utilisateur plus stable',
        'SSR Next.js : avantages SEO et performance',
        'Comprendre pourquoi le SSR avec Next.js peut améliorer SEO et performance.',
        'Technique',
        'published',
        now() - interval '6 days'
    ),
    (
        'Pourquoi Next.js améliore le SEO',
        'pourquoi-nextjs-ameliore-seo',
        'Next.js facilite la génération de pages rapides, indexables et bien structurées.',
        '# Pourquoi Next.js améliore le SEO

      Next.js apporte plusieurs avantages pour les sites orientés référencement.

      ## Points forts

      - App Router
      - Metadata dynamique
      - Pages rapides
      - Rendu serveur
      - Optimisation des images',
        'Pourquoi Next.js est bon pour le SEO',
        'Découvrez les avantages de Next.js pour créer des pages SEO performantes.',
        'Technique',
        'published',
        now() - interval '4 days'
    ),
    (
        'Pourquoi un blog aide votre acquisition',
        'pourquoi-blog-aide-acquisition',
        'Un blog permet de capter des recherches qualifiées et de soutenir la conversion.',
        '# Pourquoi un blog aide votre acquisition

      Un blog bien structuré peut générer du trafic durable.

      ## Impact business

      - Acquisition organique
      - Autorité de marque
      - Réponses aux objections
      - Contenu réutilisable en marketing',
        'Pourquoi un blog améliore l’acquisition',
        'Comprendre comment un blog peut soutenir l’acquisition et la conversion.',
        'Marketing',
        'published',
        now() - interval '2 days'
    ),

-- Drafts

    (
        'Guide complet Supabase Storage',
        'guide-complet-supabase-storage',
        'Préparer le stockage des avatars et des images d’articles avec Supabase Storage.',
        '# Guide complet Supabase Storage

      Ce brouillon présente une stratégie simple pour gérer les fichiers.

      ## À traiter

      - Buckets
      - Policies
      - Formats image
      - Limites de taille
      - URLs publiques',
        'Guide Supabase Storage',
        'Préparer une stratégie simple pour stocker les images avec Supabase Storage.',
        'Technique',
        'draft',
        null
    ),
    (
        'Mettre en place un système d’avatars',
        'mettre-en-place-systeme-avatars',
        'Comment gérer les avatars utilisateurs dans un backoffice léger.',
        '# Mettre en place un système d’avatars

      Un avatar doit être léger, carré et optimisé.

      ## À prévoir

      - Upload
      - Compression
      - WebP
      - Stockage par utilisateur',
        'Système avatar Supabase',
        'Comment mettre en place un système d’avatars simple avec Supabase.',
        'Produit',
        'draft',
        null
    ),
    (
        'Architecture d’un Blog Admin Kit',
        'architecture-blog-admin-kit',
        'Les choix techniques pour construire un kit blog réutilisable.',
        '# Architecture d’un Blog Admin Kit

      Un kit réutilisable doit rester simple.

      ## Principes

      - Feature-based architecture
      - Supabase pour auth et données
      - Tailwind pour l’UI
      - Pas de sur-ingénierie',
        'Architecture Blog Admin Kit',
        'Comprendre les choix d’architecture d’un kit blog réutilisable.',
        'Produit',
        'draft',
        null
    ),
    (
        'Créer une stratégie éditoriale avec l’IA',
        'creer-strategie-editoriale-ia',
        'Utiliser l’IA pour identifier des sujets, structurer des articles et améliorer le SEO.',
        '# Créer une stratégie éditoriale avec l’IA

      L’IA peut aider à produire plus vite, mais elle ne remplace pas la stratégie.

      ## Usages possibles

      - Idées d’articles
      - Plans détaillés
      - Reformulation
      - Optimisation des titres',
        'Stratégie éditoriale IA',
        'Utiliser l’IA pour structurer une stratégie éditoriale SEO.',
        'Rédaction',
        'draft',
        null
    ),
    (
        'Mesurer les performances SEO',
        'mesurer-performances-seo',
        'Les indicateurs simples à suivre pour comprendre si un article apporte du trafic utile.',
        '# Mesurer les performances SEO

      Un article doit être mesuré avec des indicateurs simples.

      ## KPIs possibles

      - Nombre de vues
      - Position Google
      - Clics organiques
      - Conversions générées',
        'Mesurer les performances SEO',
        'Découvrez les indicateurs à suivre pour mesurer les performances d’un article.',
        'Analytics',
        'draft',
        null
    )
on conflict (slug) do update set
                                 title = excluded.title,
                                 summary = excluded.summary,
                                 content = excluded.content,
                                 seo_title = excluded.seo_title,
                                 seo_description = excluded.seo_description,
                                 category_name = excluded.category_name,
                                 status = excluded.status,
                                 published_at = excluded.published_at,
                                 updated_at = now();
