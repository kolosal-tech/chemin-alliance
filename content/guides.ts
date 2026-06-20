/**
 * Guides pratiques — hub + pages de détail.
 *
 * Les TITRES et DESCRIPTIONS courtes vivent dans i18n
 * (`pages.guides.topics.<id>`). Le CORPS éditorial (intro, sections, points à
 * retenir) vit ici, typé, en FR avec repli i18n : les locales sans traduction
 * retombent sur le FR — même choix d'ingénierie que le blog (pas de pipeline
 * MDX ni de table Prisma, tout en restant SSR + SEO-ready).
 *
 * `ready: true` → carte cliquable vers `/guides/<id>`.
 * Aucun visuel/logo réel — uniquement line-art + dégradés de placeholder.
 */
import type { MarketingIcon } from "@/components/marketing/icons";

export type Locale = "fr" | "en" | "es" | "pt";

export type GuideBody = {
  intro: string;
  sections: { h: string; p: string }[];
  /** points clés « À retenir » */
  takeaways: string[];
};

export type GuideTopic = {
  id: string;
  icon: MarketingIcon;
  ready: boolean;
  /** ISO date (statique, pas de Date.now au build) */
  date: string;
  readingMinutes: number;
};

export const guideTopics: GuideTopic[] = [
  { id: "meeting", icon: "people", ready: true, date: "2026-05-20", readingMinutes: 4 },
  { id: "marriage", icon: "ring", ready: true, date: "2026-05-24", readingMinutes: 5 },
  { id: "intimacy", icon: "charity", ready: true, date: "2026-05-30", readingMinutes: 4 },
  { id: "faith", icon: "compass", ready: true, date: "2026-06-04", readingMinutes: 4 },
  { id: "finances", icon: "scale", ready: true, date: "2026-06-09", readingMinutes: 5 },
  { id: "parenting", icon: "home", ready: true, date: "2026-06-12", readingMinutes: 4 },
];

/** Corps éditorial par topic — FR obligatoire (repli), EN fourni. */
export const guideContent: Record<
  string,
  { fr: GuideBody } & Partial<Record<Locale, GuideBody>>
> = {
  meeting: {
    fr: {
      intro:
        "Une rencontre qui vise le mariage ne commence pas par tout dire, mais par poser des bases claires : pourquoi je suis là, à quel rythme j'avance, ce que je cherche vraiment.",
      sections: [
        {
          h: "Clarifier ses intentions",
          p: "Avant d'écrire à quelqu'un, mettez des mots sur votre intention. Cherchez-vous à vous marier, à discerner, à simplement échanger ? Le dire honnêtement, à soi puis à l'autre, évite des malentendus douloureux.",
        },
        {
          h: "Respecter le rythme",
          p: "La précipitation est rarement bonne conseillère. Laisser le temps aux premières conversations de révéler la cohérence entre les paroles et les actes protège votre cœur autant que celui de l'autre.",
        },
        {
          h: "Premières conversations",
          p: "Parlez de l'essentiel sans tout déballer : votre foi, votre rapport à la famille, vos attentes. La pudeur n'est pas de la froideur, c'est une manière d'honorer ce qui se construit.",
        },
      ],
      takeaways: [
        "Nommez votre intention avant d'engager la conversation.",
        "Aucune coordonnée n'est nécessaire pour bien commencer.",
        "La cohérence dans la durée vaut mieux qu'une bonne première impression.",
      ],
    },
    en: {
      intro:
        "A meeting aimed at marriage does not begin by saying everything, but by setting clear foundations: why I am here, at what pace I move, what I truly seek.",
      sections: [
        {
          h: "Clarify your intentions",
          p: "Before writing to someone, put your intention into words. Are you seeking marriage, discernment, or simply conversation? Saying it honestly — to yourself, then to the other — spares painful misunderstandings.",
        },
        {
          h: "Respect the pace",
          p: "Rushing rarely helps. Letting early conversations reveal the consistency between words and actions protects your heart as much as the other person's.",
        },
        {
          h: "First conversations",
          p: "Speak of what matters without unloading everything: your faith, your relationship with family, your expectations. Reserve is not coldness; it honors what is being built.",
        },
      ],
      takeaways: [
        "Name your intention before starting the conversation.",
        "No contact details are needed to begin well.",
        "Consistency over time beats a good first impression.",
      ],
    },
  },
  marriage: {
    fr: {
      intro:
        "Le passage de la rencontre à l'engagement se discerne, il ne s'improvise pas. Quelques questions, posées au bon moment, éclairent une décision qui engage toute une vie.",
      sections: [
        {
          h: "Discerner à deux",
          p: "Le discernement n'est pas une enquête, c'est une attention partagée. Observez comment vous traversez les désaccords, comment vous décidez, comment vous vous pardonnez.",
        },
        {
          h: "Les sujets qu'on n'évite pas",
          p: "Argent, famille, foi, enfants, lieu de vie : ces sujets paraissent prosaïques, mais c'est sur eux que se joue la durée. Mieux vaut un désaccord nommé tôt qu'une surprise plus tard.",
        },
        {
          h: "Se préparer vraiment",
          p: "La préparation au mariage n'est pas une formalité. Elle donne des outils concrets — communiquer, gérer un conflit, décider ensemble — qui servent bien au-delà du jour J.",
        },
      ],
      takeaways: [
        "Le désaccord bien traversé en dit plus que l'accord facile.",
        "Abordez tôt l'argent, la famille et les enfants.",
        "La préparation est un investissement, pas une case à cocher.",
      ],
    },
    en: {
      intro:
        "Moving from meeting to commitment is discerned, not improvised. A few questions, asked at the right time, illuminate a decision that engages a whole life.",
      sections: [
        {
          h: "Discern together",
          p: "Discernment is not an investigation; it is shared attention. Watch how you cross disagreements, how you decide, how you forgive.",
        },
        {
          h: "The topics you don't avoid",
          p: "Money, family, faith, children, where to live: these seem prosaic, yet they decide longevity. A disagreement named early beats a surprise later.",
        },
        {
          h: "Prepare in earnest",
          p: "Marriage preparation is not a formality. It gives concrete tools — communicating, handling conflict, deciding together — that serve far beyond the wedding day.",
        },
      ],
      takeaways: [
        "A disagreement well crossed says more than easy agreement.",
        "Raise money, family and children early.",
        "Preparation is an investment, not a checkbox.",
      ],
    },
  },
  intimacy: {
    fr: {
      intro:
        "Vivre l'attente et l'intimité avec respect ne se résume pas à des interdits. C'est une manière d'habiter le désir avec vérité et liberté, à deux.",
      sections: [
        {
          h: "L'attente comme choix",
          p: "Choisir d'attendre n'est pas réprimer, c'est donner du sens. C'est décider que l'intimité dira quelque chose d'une alliance, et pas seulement d'un instant.",
        },
        {
          h: "Se parler franchement",
          p: "Les limites se posent à deux, clairement, sans honte. Un couple qui sait nommer ce qu'il vit et ce qu'il ne veut pas vivre se protège mieux qu'un couple qui se tait.",
        },
        {
          h: "Liberté, pas perfection",
          p: "Le chemin n'est pas linéaire. Ce qui compte n'est pas une perfection affichée, mais une direction tenue ensemble, avec honnêteté et pardon.",
        },
      ],
      takeaways: [
        "Les limites se décident à deux, à voix haute.",
        "L'attente a du sens quand elle est choisie, pas subie.",
        "Mieux vaut une direction honnête qu'une perfection de façade.",
      ],
    },
    en: {
      intro:
        "Living the wait and intimacy with respect is not just about prohibitions. It is a way to inhabit desire with truth and freedom, together.",
      sections: [
        {
          h: "Waiting as a choice",
          p: "Choosing to wait is not repression; it gives meaning. It decides that intimacy will say something about a covenant, not only about a moment.",
        },
        {
          h: "Speak frankly",
          p: "Limits are set together, clearly, without shame. A couple that can name what it lives and what it refuses protects itself better than a couple that stays silent.",
        },
        {
          h: "Freedom, not perfection",
          p: "The path is not linear. What matters is not displayed perfection, but a direction held together, with honesty and forgiveness.",
        },
      ],
      takeaways: [
        "Limits are decided together, out loud.",
        "Waiting has meaning when chosen, not endured.",
        "An honest direction beats a façade of perfection.",
      ],
    },
  },
  faith: {
    fr: {
      intro:
        "Construire une vie spirituelle commune sans s'imposer l'un à l'autre demande de tenir deux libertés à la fois. C'est possible, à condition de commencer petit et vrai.",
      sections: [
        {
          h: "Deux histoires, un chemin",
          p: "Vous n'avez pas la même histoire de foi, et c'est normal. Le but n'est pas l'uniformité mais une direction partagée que chacun peut habiter à sa manière.",
        },
        {
          h: "Commencer petit",
          p: "Un temps court et régulier vaut mieux qu'un grand programme intenable. La régularité construit l'habitude ; l'ambition mal calibrée l'épuise.",
        },
        {
          h: "Respecter le for intérieur",
          p: "La prière personnelle reste personnelle. Partager sa foi ne veut pas dire tout exposer ni tout aligner ; c'est offrir, pas imposer.",
        },
      ],
      takeaways: [
        "Visez une direction partagée, pas l'uniformité.",
        "Régulier et court bat ambitieux et intenable.",
        "Partager sa foi, c'est offrir, jamais imposer.",
      ],
    },
    en: {
      intro:
        "Building a shared spiritual life without imposing on each other means holding two freedoms at once. It is possible, if you start small and true.",
      sections: [
        {
          h: "Two histories, one path",
          p: "You do not share the same faith history, and that is normal. The goal is not uniformity but a shared direction each can inhabit in their own way.",
        },
        {
          h: "Start small",
          p: "A short, regular time beats an unsustainable grand plan. Regularity builds the habit; miscalibrated ambition exhausts it.",
        },
        {
          h: "Respect the inner life",
          p: "Personal prayer stays personal. Sharing faith does not mean exposing or aligning everything; it offers, it does not impose.",
        },
      ],
      takeaways: [
        "Aim for a shared direction, not uniformity.",
        "Regular and short beats ambitious and unsustainable.",
        "Sharing faith means offering, never imposing.",
      ],
    },
  },
  finances: {
    fr: {
      intro:
        "L'argent n'est pas un sujet froid : c'est un révélateur de valeurs. Aligner vos visions sur l'argent, le travail et le foyer prévient bien des tensions.",
      sections: [
        {
          h: "Mettre les chiffres sur la table",
          p: "Parler argent tôt n'est pas vénal, c'est lucide. Revenus, dettes, habitudes de dépense : la transparence évite les mauvaises surprises et les non-dits qui s'enveniment.",
        },
        {
          h: "Des valeurs avant un budget",
          p: "Avant de répartir des euros, partagez ce que l'argent représente pour vous : sécurité, générosité, liberté ? Un budget commun découle de valeurs communes.",
        },
        {
          h: "Travail et foyer",
          p: "Comment voyez-vous l'équilibre entre travail et vie de famille ? Qui fait quoi, et pourquoi ? Ces questions méritent d'être posées avant, pas découvertes après.",
        },
      ],
      takeaways: [
        "La transparence financière se pose tôt, sans gêne.",
        "Clarifiez vos valeurs avant votre budget.",
        "L'équilibre travail-foyer se discute, il ne se devine pas.",
      ],
    },
    en: {
      intro:
        "Money is not a cold subject: it reveals values. Aligning your views on money, work and home prevents many tensions.",
      sections: [
        {
          h: "Put the numbers on the table",
          p: "Talking money early is not mercenary; it is clear-eyed. Income, debt, spending habits: transparency avoids bad surprises and festering unspoken things.",
        },
        {
          h: "Values before a budget",
          p: "Before splitting euros, share what money means to you: security, generosity, freedom? A shared budget flows from shared values.",
        },
        {
          h: "Work and home",
          p: "How do you see the balance between work and family life? Who does what, and why? These questions deserve to be asked before, not discovered after.",
        },
      ],
      takeaways: [
        "Financial transparency comes early, without awkwardness.",
        "Clarify your values before your budget.",
        "The work-home balance is discussed, not guessed.",
      ],
    },
  },
  parenting: {
    fr: {
      intro:
        "La question des enfants et de l'éducation se pense sereinement, et tôt. Non pour tout planifier, mais pour vérifier que vos visions ne s'opposent pas.",
      sections: [
        {
          h: "En parler sans pression",
          p: "Vouloir des enfants, combien, quand : ces questions n'appellent pas de réponse définitive immédiate, mais une conversation honnête vaut mieux qu'un présupposé silencieux.",
        },
        {
          h: "Transmettre quoi ?",
          p: "Quelle place pour la foi, les traditions, les origines de chacun dans l'éducation ? Mieux vaut découvrir un écart de vision avant qu'après.",
        },
        {
          h: "Anticiper sans tout figer",
          p: "On ne décide pas d'une famille comme d'un projet d'entreprise. L'idée n'est pas de tout verrouiller, mais de s'assurer qu'on regarde dans la même direction.",
        },
      ],
      takeaways: [
        "Parlez des enfants tôt, sans en faire un ultimatum.",
        "La transmission (foi, origines) mérite d'être explicitée.",
        "Regarder dans la même direction prime sur tout planifier.",
      ],
    },
    en: {
      intro:
        "The question of children and upbringing is thought through calmly, and early. Not to plan everything, but to check that your visions do not clash.",
      sections: [
        {
          h: "Talk without pressure",
          p: "Wanting children, how many, when: these questions need no immediate final answer, but an honest conversation beats a silent assumption.",
        },
        {
          h: "Transmit what?",
          p: "What place for faith, traditions and each person's origins in upbringing? Better to discover a gap in vision before than after.",
        },
        {
          h: "Anticipate without freezing everything",
          p: "A family is not decided like a business plan. The idea is not to lock everything down, but to make sure you look in the same direction.",
        },
      ],
      takeaways: [
        "Talk about children early, without making it an ultimatum.",
        "Transmission (faith, origins) deserves to be made explicit.",
        "Looking in the same direction matters more than planning all.",
      ],
    },
  },
};

export function getGuideTopic(id: string): GuideTopic | undefined {
  return guideTopics.find((g) => g.id === id);
}

/** Corps localisé d'un guide avec repli sur le FR. */
export function localizedGuide(
  article: { fr: GuideBody } & Partial<Record<Locale, GuideBody>>,
  locale: string,
): GuideBody {
  return article[locale as Locale] ?? article.fr;
}
