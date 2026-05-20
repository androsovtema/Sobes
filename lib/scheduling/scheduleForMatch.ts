/**
 * Серверная обвязка для findAvailableSlot:
 *   - грузит слоты кандидата и позиции
 *   - собирает занятые интервалы (proposedSlotAt у других PENDING-инвайтов
 *     + scheduled Interview) кандидата и HR-позиции
 *   - вызывает pure findAvailableSlot
 */
import { prisma } from "@/lib/prisma";
import { findAvailableSlot, type BusyInterval } from "./findSlot";
import type { Slot } from "@/lib/matching/types";

const DEFAULT_DURATION_MIN = 60;

export async function findSlotForMatch(matchId: string): Promise<Date | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      candidate: { include: { timeSlots: true } },
      position: { include: { hrSlots: true } },
    },
  });
  if (!match) return null;

  const candidateSlots: Slot[] = match.candidate.timeSlots.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    maxPerDay: s.maxPerDay,
  }));
  const hrSlots: Slot[] = match.position.hrSlots.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    maxPerDay: s.maxPerDay,
  }));

  // Занятость кандидата: все его SCHEDULED Interview + proposedSlotAt из INVITED.
  const candidateBusy = await loadCandidateBusy(match.candidateId);
  // Занятость HR по этой позиции: SCHEDULED + INVITED с proposedSlotAt.
  const hrBusy = await loadPositionBusy(match.positionId);

  return findAvailableSlot({
    candidateSlots,
    hrSlots,
    candidateBusy,
    hrBusy,
    durationMin: DEFAULT_DURATION_MIN,
  });
}

async function loadCandidateBusy(candidateId: string): Promise<BusyInterval[]> {
  const matches = await prisma.match.findMany({
    where: {
      candidateId,
      OR: [
        { status: "INVITED", proposedSlotAt: { not: null } },
        { status: "SCHEDULED" },
      ],
    },
    include: { interview: true },
  });
  return matches.map((m) => intervalFromMatch(m));
}

async function loadPositionBusy(positionId: string): Promise<BusyInterval[]> {
  const matches = await prisma.match.findMany({
    where: {
      positionId,
      OR: [
        { status: "INVITED", proposedSlotAt: { not: null } },
        { status: "SCHEDULED" },
      ],
    },
    include: { interview: true },
  });
  return matches.map((m) => intervalFromMatch(m));
}

type MatchWithInterview = {
  proposedSlotAt: Date | null;
  interview: { scheduledAt: Date; durationMin: number } | null;
};

function intervalFromMatch(m: MatchWithInterview): BusyInterval {
  if (m.interview) {
    return { startAt: m.interview.scheduledAt, durationMin: m.interview.durationMin };
  }
  // proposedSlotAt гарантирован фильтром, но компилятор не знает.
  return { startAt: m.proposedSlotAt!, durationMin: DEFAULT_DURATION_MIN };
}
