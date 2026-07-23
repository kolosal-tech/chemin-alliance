/**
 * Seed démo - comptes documentés dans le README.
 * Mot de passe commun : Alliance2026!
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createCipheriv, randomBytes } from "node:crypto";
import { SENSITIVE_DATA_CONSENT } from "../lib/sensitive-data-consent-scope";
import { TERMS_OF_SERVICE_CONSENT } from "../lib/legal/consent-scope";

const prisma = new PrismaClient();

const ENC_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "hex");
function enc(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${ct.toString("base64")}`;
}

async function main() {
  const password = await hash("Alliance2026!", {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const users = [
    {
      email: "elodie@demo.chemin-alliance.app",
      displayName: "Élodie",
      age: 32,
      gender: "F",
      cityApprox: "Région parisienne",
      faith: {
        vertical: "CHRISTIAN_EVANGELICAL" as const,
        denomination: "Évangélique",
        ministry: "Louange & intercession",
        engagementFrequency: "hebdomadaire",
        localChurchEncrypted: enc("Église Évangélique de Paris-Est"),
        testimonyEncrypted: enc(
          "J'ai grandi dans la foi et je cherche à construire un foyer enraciné dans la vérité et la patience.",
        ),
      },
      rel: {
        maritalStatus: "single",
        hasChildren: false,
        wantsChildren: true,
        acceptsChildren: true,
        intentionStatement:
          "Avancer avec vérité et patience, vers un foyer enraciné dans la foi.",
        familyVisionEncrypted: enc(
          "Une famille où la foi se transmet par l'exemple, avec douceur.",
        ),
      },
    },
    {
      email: "jonathan@demo.chemin-alliance.app",
      displayName: "Jonathan",
      age: 34,
      gender: "M",
      cityApprox: "Lyon",
      faith: {
        vertical: "CHRISTIAN_EVANGELICAL" as const,
        denomination: "Évangélique",
        ministry: "Enseignement jeunesse",
        engagementFrequency: "hebdomadaire",
        localChurchEncrypted: enc("Église Baptiste de Lyon-Centre"),
        testimonyEncrypted: enc(
          "Converti à 20 ans, je veux construire une famille où la Parole a la première place.",
        ),
      },
      rel: {
        maritalStatus: "single",
        hasChildren: false,
        wantsChildren: true,
        acceptsChildren: true,
        intentionStatement:
          "Un projet de vie clair : le mariage, sans précipitation.",
        familyVisionEncrypted: enc(
          "Des enfants élevés dans la foi, ouverts au monde.",
        ),
      },
    },
    {
      email: "marie-claire@demo.chemin-alliance.app",
      displayName: "Marie-Claire",
      age: 41,
      gender: "F",
      cityApprox: "Bruxelles",
      faith: {
        vertical: "CHRISTIAN_CATHOLIC" as const,
        denomination: "Catholique",
        ministry: "Catéchèse",
        engagementFrequency: "hebdomadaire",
        localChurchEncrypted: enc("Paroisse Sainte-Croix, Bruxelles"),
        testimonyEncrypted: enc(
          "Veuve depuis quatre ans, maman d'un enfant. La foi m'a portée ; j'avance avec espérance et pudeur.",
        ),
      },
      rel: {
        maritalStatus: "widowed",
        hasChildren: true,
        wantsChildren: false,
        acceptsChildren: true,
        intentionStatement:
          "Recommencer avec pudeur, respect et accompagnement.",
        familyVisionEncrypted: enc(
          "Une famille recomposée dans la grâce, où chacun a sa place.",
        ),
      },
      rulesetId: "christian_catholic_default",
    },
    {
      email: "david@demo.chemin-alliance.app",
      displayName: "David",
      age: 38,
      gender: "M",
      cityApprox: "Marseille",
      faith: {
        vertical: "CHRISTIAN_EVANGELICAL" as const,
        denomination: "Évangélique",
        ministry: "Accueil",
        engagementFrequency: "régulier",
        localChurchEncrypted: enc(
          "Église Protestante Évangélique de Marseille",
        ),
        testimonyEncrypted: enc(
          "Divorcé, reconstruit dans la grâce. Je crois aux secondes chances vécues dans la vérité.",
        ),
      },
      rel: {
        maritalStatus: "divorced",
        hasChildren: false,
        wantsChildren: true,
        acceptsChildren: true,
        intentionStatement:
          "Discerner avec vérité, accompagnement et responsabilité.",
        familyVisionEncrypted: enc(
          "Un foyer simple, honnête, tourné vers les autres.",
        ),
      },
    },
    {
      email: "sarah@demo.chemin-alliance.app",
      displayName: "Sarah",
      age: 36,
      gender: "F",
      cityApprox: "Montréal",
      faith: {
        vertical: "CHRISTIAN_EVANGELICAL" as const,
        denomination: "Pentecôtiste",
        ministry: "Groupe de femmes",
        engagementFrequency: "hebdomadaire",
        localChurchEncrypted: enc("Assemblée de Montréal-Nord"),
        testimonyEncrypted: enc(
          "Maman solo de deux enfants merveilleux. Ma priorité : un homme qui accueille notre réalité familiale avec joie.",
        ),
      },
      rel: {
        maritalStatus: "single_parent",
        hasChildren: true,
        wantsChildren: true,
        acceptsChildren: true,
        intentionStatement:
          "Avancer avec vérité, responsabilité et protection de ma famille.",
        familyVisionEncrypted: enc(
          "La transmission de la foi à mes enfants est non négociable.",
        ),
      },
    },
    {
      email: "emmanuel@demo.chemin-alliance.app",
      displayName: "Emmanuel",
      age: 47,
      gender: "M",
      cityApprox: "Genève",
      faith: {
        vertical: "CHRISTIAN_CATHOLIC" as const,
        denomination: "Catholique",
        ministry: "Chorale paroissiale",
        engagementFrequency: "hebdomadaire",
        localChurchEncrypted: enc("Paroisse Saint-Joseph, Genève"),
        testimonyEncrypted: enc(
          "Veuf, deux grands enfants. La maturité m'a appris que l'essentiel se construit à deux, devant Dieu.",
        ),
      },
      rel: {
        maritalStatus: "widowed",
        hasChildren: true,
        wantsChildren: false,
        acceptsChildren: true,
        intentionStatement:
          "Ton parcours a de la valeur : construire une relation à la hauteur de la maturité.",
        familyVisionEncrypted: enc("L'accueil, la fidélité, la paix du foyer."),
      },
      rulesetId: "christian_catholic_default",
    },
  ];

  const created: Record<string, string> = {};
  for (const u of users) {
    const { faith, rel, rulesetId, ...base } = u;
    const user = await prisma.user.upsert({
      where: { email: base.email },
      // Le seed est un outil de développement reproductible : une relance
      // doit restaurer le mot de passe documenté et la vérification des comptes
      // de démonstration, sans réactiver un compte soft-supprimé.
      update: { passwordHash: password, isVerified: true },
      create: {
        ...base,
        passwordHash: password,
        isVerified: true,
        locale: "fr",
        rulesetId: rulesetId ?? "christian_evangelical_default",
        faithProfile: { create: faith },
        relationshipProfile: { create: rel },
        privacySettings: { create: {} },
        consents: {
          createMany: {
            data: [SENSITIVE_DATA_CONSENT, TERMS_OF_SERVICE_CONSENT],
          },
        },
      },
    });
    created[base.displayName] = user.id;
  }

  // Admin (modération)
  await prisma.user.upsert({
    where: { email: "admin@chemin-alliance.app" },
    update: { passwordHash: password, isVerified: true },
    create: {
      email: "admin@chemin-alliance.app",
      passwordHash: password,
      displayName: "Modération",
      age: 40,
      role: "ADMIN",
      isVerified: true,
      faithProfile: { create: { vertical: "CHRISTIAN_EVANGELICAL" } },
      relationshipProfile: { create: { maritalStatus: "single" } },
      privacySettings: { create: { invisibleMode: true } },
    },
  });

  // Match 1 : Élodie–Jonathan, étape DISCERNMENT, messages + blocage
  const [a1, b1] = [created["Élodie"], created["Jonathan"]].sort();
  const match1 = await prisma.match.upsert({
    where: { userAId_userBId: { userAId: a1, userBId: b1 } },
    update: {},
    create: {
      userAId: a1,
      userBId: b1,
      stage: "DISCERNMENT",
      status: "ACTIVE",
    },
  });
  const msgs1 = [
    {
      sender: created["Jonathan"],
      content:
        "Merci pour ton message hier. Ta vision de la famille m'a beaucoup touché.",
    },
    {
      sender: created["Élodie"],
      content:
        "C'est réciproque. Ta façon de parler de la transmission de la foi me rejoint profondément.",
    },
  ];
  for (const m of msgs1) {
    await prisma.message.create({
      data: {
        matchId: match1.id,
        senderId: m.sender,
        contentEncrypted: enc(m.content),
      },
    });
  }
  // Message déclenchant le blocage coordonnées (démo)
  await prisma.message.create({
    data: {
      matchId: match1.id,
      senderId: created["Jonathan"],
      contentEncrypted: enc("Appelle-moi ce soir au 06 12 34 56 78 !"),
      moderationStatus: "BLOCKED",
      blockedReason: "CONTACT_BLOCKED_BEFORE_TRUST",
    },
  });
  await prisma.message.create({
    data: {
      matchId: match1.id,
      senderId: created["Jonathan"],
      kind: "SYSTEM",
      contentEncrypted: enc(
        "Pour votre sécurité, le partage de coordonnées personnelles n'est pas encore disponible à cette étape. Il sera proposé à l'étape Discernement, après validation mutuelle de confiance. Continuez votre échange ici en attendant.",
      ),
    },
  });
  // Réponses Dialogue (pour remplir minimum_dialogue_completed)
  const dialogueAnswers = [
    {
      user: created["Élodie"],
      q: "dial_church",
      a: "Mon église est ma seconde famille ; j'y sers chaque semaine.",
    },
    {
      user: created["Élodie"],
      q: "dial_children",
      a: "L'exemple d'abord, la parole ensuite.",
    },
    {
      user: created["Jonathan"],
      q: "dial_church",
      a: "Engagé dans l'enseignement des jeunes depuis 8 ans.",
    },
    {
      user: created["Jonathan"],
      q: "dial_finances",
      a: "Budget commun, transparence totale, dîme assumée.",
    },
  ];
  for (const d of dialogueAnswers) {
    await prisma.allianceAnswer.upsert({
      where: {
        matchId_userId_questionId: {
          matchId: match1.id,
          userId: d.user,
          questionId: d.q,
        },
      },
      update: {},
      create: {
        matchId: match1.id,
        userId: d.user,
        stage: "DIALOGUE",
        questionId: d.q,
        answerEncrypted: enc(d.a),
        answerLegacy: "",
      },
    });
  }

  // Match 2 : Sarah–David, étape DIALOGUE
  const [a2, b2] = [created["Sarah"], created["David"]].sort();
  const match2 = await prisma.match.upsert({
    where: { userAId_userBId: { userAId: a2, userBId: b2 } },
    update: {},
    create: { userAId: a2, userBId: b2, stage: "DIALOGUE", status: "ACTIVE" },
  });
  await prisma.message.create({
    data: {
      matchId: match2.id,
      senderId: created["Sarah"],
      contentEncrypted: enc(
        "J'apprécie ta franchise sur ton parcours. La vérité d'abord, toujours.",
      ),
    },
  });
  await prisma.message.create({
    data: {
      matchId: match2.id,
      senderId: created["David"],
      contentEncrypted: enc(
        "Merci Sarah. Tes enfants ont une maman courageuse - j'aimerais en savoir plus sur votre quotidien, à ton rythme.",
      ),
    },
  });

  // 3 coachs vérifiés
  const coaches = [
    {
      displayName: "Daniel Mercier",
      certified: true,
      specialties: [
        "Préparation au mariage",
        "Familles recomposées",
        "Accompagnement parental",
      ],
      affiliation: "Église Réformée de Lyon · accompagnement pastoral",
      bio: "Vingt ans d'accompagnement de couples, avec un cœur pour les familles recomposées.",
      pricePerSessionEUR: 70,
      ratingAvg: 4.9,
      reviewsCount: 38,
    },
    {
      displayName: "Sœur Anne Lefèvre",
      certified: true,
      specialties: ["Discernement", "Préparation au mariage", "Vie de prière"],
      affiliation: "Diocèse de Paris · pastorale des familles",
      bio: "Accompagnatrice spirituelle, spécialisée dans le discernement avant l'engagement.",
      pricePerSessionEUR: 50,
      ratingAvg: 4.8,
      reviewsCount: 25,
    },
    {
      displayName: "Pascal & Ruth Nguema",
      certified: true,
      specialties: ["Couple mentor", "Communication", "Finances du foyer"],
      affiliation: "Communauté Évangélique de Bruxelles",
      bio: "Couple mentor depuis 15 ans. Nous croyons aux conversations vraies, sans masque.",
      pricePerSessionEUR: 90,
      ratingAvg: 5.0,
      reviewsCount: 17,
    },
  ];
  for (const c of coaches) {
    const exists = await prisma.coach.findFirst({
      where: { displayName: c.displayName },
    });
    if (!exists) await prisma.coach.create({ data: c });
  }

  console.log(
    "Seed terminé :",
    Object.keys(created).join(", "),
    "+ admin + 3 coachs",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
