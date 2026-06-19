"use client";

import { useState } from "react";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { IncompleteProfileModal } from "@/components/IncompleteProfileModal";
import { OnboardingIntroCard } from "@/components/OnboardingIntroCard";
import { profileCompletion } from "@/lib/profile-completion";

/**
 * Vitrine design-system des composants Phase 2 (jauge + modale), avec données
 * fictives — permet la validation visuelle sans authentification ni flag actif.
 * Non utilisé en production (uniquement /design-system).
 */
const mock = profileCompletion({
  isVerified: true,
  photoUrl: "https://x/p.png",
  cityApprox: "Lyon",
  faithProfile: { denomination: "Évangélique", engagementFrequency: null },
  relationshipProfile: {
    intentionStatement: "Avancer avec vérité et patience.",
    wantsChildren: null,
    interests: null,
    personality: null,
    aspirations: null,
  },
});

export function Phase2Showcase() {
  const [openModal, setOpenModal] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <OnboardingIntroCard onDone={() => {}} />
      <OnboardingProgress completion={mock} />
      <button
        type="button"
        onClick={() => setOpenModal(true)}
        className="mt-4 rounded-btn border border-navy px-5 py-3 text-sm font-semibold text-navy dark:border-gold-light dark:text-gold-light"
      >
        Ouvrir la modale
      </button>
      {openModal && <IncompleteProfileModal completion={mock} />}
    </div>
  );
}
