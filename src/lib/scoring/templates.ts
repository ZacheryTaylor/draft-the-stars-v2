/** Scoring templates. Mirrors the rows seeded into public.scoring_templates. */
import type { ScoringRules } from "./types";

export interface ScoringTemplate {
  slug: string;
  name: string;
  description: string;
  rules: ScoringRules;
  /** Each drafted member of a unit earns the unit's full points (DWTS: celebrity and pro). */
  split: "full_each";
  maxPossible: "capped_by_remaining";
}

export const DWTS_TEMPLATE: ScoringTemplate = {
  slug: "dwts-couple-score-x-round-value",
  name: "Ballroom: couple score ÷ 30 × round value",
  description:
    "Each drafted celebrity and each drafted pro earns (couple score ÷ 30) × that week's round value. Max Possible assumes perfect scores for the couples still dancing, capped by how many couples remain each week.",
  rules: { maxScore: 30, roundValues: [10, 12, 14, 16, 18, 20, 23, 26, 29, 32, 36] },
  split: "full_each",
  maxPossible: "capped_by_remaining",
};

export const SCORING_TEMPLATES: ScoringTemplate[] = [DWTS_TEMPLATE];

export function getTemplate(slug: string | null | undefined): ScoringTemplate {
  return SCORING_TEMPLATES.find((t) => t.slug === slug) ?? DWTS_TEMPLATE;
}
