/**
 * MutualInterest — P_accept × P_invite.
 * Множитель ∈ [0..1] для финального балла.
 *
 * В MVP — эвристики без ML. Когда накопятся данные, эти функции
 * заменятся обученной регрессией с тем же интерфейсом.
 */
import { WEIGHTS } from "./weights";
import type { CandidateInput, PositionInput } from "./types";

export type InterestBreakdown = {
  pAccept: number;
  pInvite: number;
  multiplier: number;
};

export function calculateMutualInterest(
  candidate: CandidateInput,
  position: PositionInput,
  fitScore: number
): InterestBreakdown {
  const pAccept = estimatePAccept(candidate, position);
  const pInvite = estimatePInvite(candidate, fitScore);
  return {
    pAccept,
    pInvite,
    multiplier: pAccept * pInvite,
  };
}

/**
 * P_accept — насколько вероятно, что кандидат примет приглашение.
 * Главные драйверы: зарплата и формат относительно его ожиданий.
 */
function estimatePAccept(candidate: CandidateInput, position: PositionInput): number {
  const cfg = WEIGHTS.interest.pAccept;

  // Зарплата: смотрим на верхнюю границу предложения относительно нижней границы кандидата.
  const salaryRatio = candidate.salaryMin > 0
    ? position.salaryMax / candidate.salaryMin
    : 1;
  let salaryComponent: number;
  if (salaryRatio >= cfg.idealSalaryRatio) salaryComponent = 1;
  else if (salaryRatio <= cfg.minSalaryRatio) salaryComponent = 0.3;
  else {
    salaryComponent = 0.3 + 0.7 * (salaryRatio - cfg.minSalaryRatio)
                              / (cfg.idealSalaryRatio - cfg.minSalaryRatio);
  }

  // Формат: точное совпадение даёт бонус.
  const formatComponent = candidate.workFormat === position.workFormat
    ? 1
    : 1 - cfg.formatExactBonus;

  const raw = salaryComponent * formatComponent;
  return Math.max(cfg.floor, raw);
}

/**
 * P_invite — насколько вероятно, что HR пригласит кандидата.
 * Зависит от полноты профиля и силы fit.
 */
function estimatePInvite(candidate: CandidateInput, fitScore: number): number {
  const cfg = WEIGHTS.interest.pInvite;

  // Полнота профиля: портфолио + bio.
  const completeness =
    (candidate.hasPortfolio ? 0.6 : 0) +
    (candidate.hasBio ? 0.4 : 0);
  const completenessComponent = 1 - cfg.profileCompletenessWeight
                                + cfg.profileCompletenessWeight * completeness;

  // Слабый fit → HR с большей вероятностью скипнет.
  const fitMultiplier = fitScore < cfg.lowFitPenaltyThreshold
    ? cfg.lowFitMultiplier
    : 1;

  const raw = completenessComponent * fitMultiplier;
  return Math.max(cfg.floor, raw);
}
