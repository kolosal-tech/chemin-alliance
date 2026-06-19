/**
 * Blog minimaliste — contenu typé en repo (pas de pipeline MDX ni de table
 * Prisma : choix d'ingénierie pour éviter de toucher next.config / le schéma,
 * tout en restant SSR + SEO-ready). Le contenu éditorial est en FR avec
 * repli i18n : les locales sans traduction retombent sur le FR (cf. brief).
 * Le chrome d'UI (boutons, libellés) vit dans `messages` (namespace `blog`).
 */
export type Locale = "fr" | "en" | "es" | "pt";

export type PostContent = {
  title: string;
  excerpt: string;
  /** paragraphes du corps */
  body: string[];
};

export type Post = {
  slug: string;
  /** ISO date (statique, pas de Date.now au build) */
  date: string;
  readingMinutes: number;
  /** dégradé du visuel d'en-tête (pas de photo réelle) */
  gradient: string;
  content: { fr: PostContent } & Partial<Record<Locale, PostContent>>;
};

export const posts: Post[] = [
  {
    slug: "discerner-sans-se-presser",
    date: "2026-05-28",
    readingMinutes: 5,
    gradient: "from-navy via-night to-[#0E1626]",
    content: {
      fr: {
        title: "Discerner sans se presser",
        excerpt:
          "Pourquoi prendre le temps du discernement protège votre cœur — et celui de l'autre.",
        body: [
          "Dans une culture de l'immédiat, prendre le temps de discerner peut sembler à contre-courant. Pourtant, c'est précisément ce temps qui permet à une relation de reposer sur autre chose qu'une première impression.",
          "Le discernement n'est pas de l'indécision. C'est une attention active : poser les bonnes questions, écouter ce qui se dit et ce qui ne se dit pas, observer la cohérence entre les paroles et les actes.",
          "Concrètement, cela passe par des étapes : apprendre à se connaître avant de tout dévoiler, parler de l'essentiel — la foi, le projet de vie, le rapport à la famille — sans précipitation, et accepter que la confiance se construit, elle ne se décrète pas.",
          "Le parcours d'Alliance est pensé pour cela : chaque étape ouvre la suivante quand vous êtes prêt·e, jamais avant.",
        ],
      },
      en: {
        title: "Discerning without rushing",
        excerpt:
          "Why taking time to discern protects your heart — and the other person's.",
        body: [
          "In a culture of immediacy, taking time to discern can feel countercultural. Yet it is precisely that time which lets a relationship rest on more than a first impression.",
          "Discernment is not indecision. It is active attention: asking the right questions, listening to what is said and unsaid, watching the consistency between words and actions.",
          "In practice, that means stages: getting to know each other before revealing everything, talking about what matters — faith, life plans, family — without rushing, and accepting that trust is built, not declared.",
          "The covenant journey is designed for this: each step opens the next when you are ready, never before.",
        ],
      },
    },
  },
  {
    slug: "la-confidentialite-comme-respect",
    date: "2026-06-10",
    readingMinutes: 4,
    gradient: "from-sage via-navy to-night",
    content: {
      fr: {
        title: "La confidentialité comme acte de respect",
        excerpt:
          "Protéger ses coordonnées n'est pas de la méfiance : c'est se donner le droit d'avancer en confiance.",
        body: [
          "Donner son numéro à un inconnu, c'est offrir une porte ouverte sur sa vie. Pouvoir échanger sans dévoiler ses coordonnées change tout : on parle librement, sans la pression d'un canal qu'on ne maîtrise plus.",
          "Chez Chemin d'Alliance, le partage des coordonnées n'est débloqué qu'à l'étape Discernement, lorsque la confiance est mutuellement validée. Ce n'est pas une contrainte arbitraire, c'est une protection pour tous.",
          "Cette pudeur numérique honore l'autre autant qu'elle vous protège. Elle dit : je veux te connaître pour ce que tu es, pas pour la rapidité avec laquelle tu obtiens mon numéro.",
        ],
      },
    },
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

/** Contenu localisé d'un post avec repli sur le FR. */
export function localizedContent(post: Post, locale: string): PostContent {
  return post.content[locale as Locale] ?? post.content.fr;
}
