/**
 * Blog minimaliste - contenu typé en repo (pas de pipeline MDX ni de table
 * Prisma : choix d'ingénierie pour éviter de toucher next.config / le schéma,
 * tout en restant SSR + SEO-ready). Le contenu éditorial est en FR avec
 * repli i18n : les locales sans traduction retombent sur le FR (cf. brief).
 * Le chrome d'UI (boutons, libellés, libellés de catégorie) vit dans `messages`
 * (namespace `pages.blog`).
 */
export type Locale = "fr" | "en" | "es" | "pt";

/** Catégories éditoriales - libellés dans i18n (`pages.blog.categories.<id>`). */
export const categories = [
  "discernement",
  "securite",
  "spiritualite",
  "temoignages",
] as const;
export type CategoryId = (typeof categories)[number];

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
  category: CategoryId;
  /** dégradé du visuel d'en-tête (pas de photo réelle) */
  gradient: string;
  content: { fr: PostContent } & Partial<Record<Locale, PostContent>>;
};

export const posts: Post[] = [
  {
    slug: "discerner-sans-se-presser",
    date: "2026-05-28",
    readingMinutes: 5,
    category: "discernement",
    gradient: "from-navy via-night to-[#0E1626]",
    content: {
      fr: {
        title: "Discerner sans se presser",
        excerpt:
          "Pourquoi prendre le temps du discernement protège votre cœur - et celui de l'autre.",
        body: [
          "Dans une culture de l'immédiat, prendre le temps de discerner peut sembler à contre-courant. Pourtant, c'est précisément ce temps qui permet à une relation de reposer sur autre chose qu'une première impression.",
          "Le discernement n'est pas de l'indécision. C'est une attention active : poser les bonnes questions, écouter ce qui se dit et ce qui ne se dit pas, observer la cohérence entre les paroles et les actes.",
          "Concrètement, cela passe par des étapes : apprendre à se connaître avant de tout dévoiler, parler de l'essentiel - la foi, le projet de vie, le rapport à la famille - sans précipitation, et accepter que la confiance se construit, elle ne se décrète pas.",
          "Le parcours d'Alliance est pensé pour cela : chaque étape ouvre la suivante quand vous êtes prêt·e, jamais avant.",
        ],
      },
      en: {
        title: "Discerning without rushing",
        excerpt:
          "Why taking time to discern protects your heart - and the other person's.",
        body: [
          "In a culture of immediacy, taking time to discern can feel countercultural. Yet it is precisely that time which lets a relationship rest on more than a first impression.",
          "Discernment is not indecision. It is active attention: asking the right questions, listening to what is said and unsaid, watching the consistency between words and actions.",
          "In practice, that means stages: getting to know each other before revealing everything, talking about what matters - faith, life plans, family - without rushing, and accepting that trust is built, not declared.",
          "The covenant journey is designed for this: each step opens the next when you are ready, never before.",
        ],
      },
    },
  },
  {
    slug: "la-confidentialite-comme-respect",
    date: "2026-06-10",
    readingMinutes: 4,
    category: "securite",
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
  {
    slug: "prier-ensemble-sans-se-forcer",
    date: "2026-06-14",
    readingMinutes: 4,
    category: "spiritualite",
    gradient: "from-gold/60 via-navy to-night",
    content: {
      fr: {
        title: "Prier ensemble sans se forcer",
        excerpt:
          "Construire une vie spirituelle commune au rythme de deux libertés, jamais d'une contrainte.",
        body: [
          "Partager sa foi à deux ne signifie pas tout vivre à l'identique. Deux histoires spirituelles se rencontrent, avec leurs habitudes, leurs silences et leurs élans propres.",
          "La tentation est grande d'imposer son rythme : prier comme on a toujours prié, attendre de l'autre qu'il suive. Mais une vie spirituelle partagée se construit, elle ne se décrète pas - exactement comme la confiance.",
          "Quelques repères simples aident : commencer petit, par un temps court et régulier plutôt qu'un grand programme intenable ; laisser à chacun ses formes de prière personnelle ; et parler de ce qui nourrit vraiment, sans jugement.",
          "Sur Chemin d'Alliance, rien n'oblige à afficher sa pratique. La foi se partage quand elle est prête à l'être, au fil des étapes, jamais sous la pression d'un profil à remplir.",
        ],
      },
      en: {
        title: "Praying together without forcing it",
        excerpt:
          "Building a shared spiritual life at the pace of two freedoms, never of a constraint.",
        body: [
          "Sharing faith as a couple does not mean living everything identically. Two spiritual histories meet, each with its own habits, silences and impulses.",
          "The temptation is strong to impose your own rhythm: to pray as you always have, expecting the other to follow. But a shared spiritual life is built, not declared - just like trust.",
          "A few simple markers help: start small, with a short and regular time rather than an unsustainable grand plan; leave each person their own forms of personal prayer; and talk about what truly nourishes, without judgment.",
          "On Chemin d'Alliance, nothing forces you to display your practice. Faith is shared when it is ready to be, step by step, never under the pressure of a profile to fill in.",
        ],
      },
    },
  },
  {
    slug: "ce-que-nous-avons-appris-en-chemin",
    date: "2026-06-18",
    readingMinutes: 6,
    category: "temoignages",
    gradient: "from-amberink via-navy to-[#0E1626]",
    content: {
      fr: {
        title: "Ce que nous avons appris en chemin",
        excerpt:
          "Un récit, anonymisé, de ce qui change quand on accepte d'avancer une étape à la fois.",
        body: [
          "Nous nous écrivions depuis quelques semaines sans avoir échangé le moindre numéro. Au début, cette règle nous a frustrés ; avec le recul, c'est elle qui nous a appris à parler de l'essentiel.",
          "Sans la facilité d'un message à toute heure, chaque échange comptait davantage. Nous avons parlé de nos familles, de nos blessures, de ce que nous attendions vraiment d'une union - avant de parler logistique.",
          "Quand l'étape du discernement s'est ouverte, partager nos coordonnées n'était plus un saut dans le vide : c'était une suite naturelle, posée sur une confiance déjà construite.",
          "Ce que nous retenons : la lenteur n'est pas un obstacle. C'est un cadre qui protège, à condition de l'habiter avec sincérité. Le reste appartient à chaque histoire.",
          "Ce témoignage est une composition représentative, partagée dans le respect de l'anonymat - pas le récit d'un couple identifiable.",
        ],
      },
      en: {
        title: "What we learned along the way",
        excerpt:
          "An anonymized account of what changes when you agree to move one step at a time.",
        body: [
          "We had been writing to each other for a few weeks without ever exchanging a number. At first that rule frustrated us; in hindsight, it is what taught us to talk about what matters.",
          "Without the ease of a message at any hour, each exchange counted more. We spoke of our families, our wounds, what we truly hoped for in a union - before talking logistics.",
          "When the discernment stage opened, sharing our contact details was no longer a leap into the void: it was a natural next step, resting on trust already built.",
          "What we keep: slowness is not an obstacle. It is a frame that protects, provided you inhabit it sincerely. The rest belongs to each story.",
          "This testimony is a representative composition, shared with respect for anonymity - not the account of an identifiable couple.",
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
