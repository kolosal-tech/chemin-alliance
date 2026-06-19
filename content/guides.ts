/**
 * Hub de guides pratiques. Les titres/descriptions vivent dans i18n
 * (`pages.guides.topics.<id>`) ; ici la structure + l'icône + le statut.
 * `ready: false` → carte informative non cliquable (détail en Phase 2).
 */
import type { MarketingIcon } from "@/components/marketing/icons";

export const guideTopics: {
  id: string;
  icon: MarketingIcon;
  ready: boolean;
}[] = [
  { id: "meeting", icon: "people", ready: false },
  { id: "marriage", icon: "ring", ready: false },
  { id: "intimacy", icon: "charity", ready: false },
  { id: "faith", icon: "compass", ready: false },
  { id: "finances", icon: "scale", ready: false },
  { id: "parenting", icon: "home", ready: false },
];
