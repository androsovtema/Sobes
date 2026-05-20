import { randomUUID } from "node:crypto";

// Yandex CalDAV — создание события с Телемост-конференцией.
// Документация CalDAV: https://yandex.ru/dev/calendar/doc/dg/concepts/about.html
// Telemost создаётся через свойство X-TELEMOST-CONFERENCE:1; URL появляется в теле GET-ответа.

const CALDAV_BASE = "https://caldav.yandex.ru";

export type CreateEventOptions = {
  title: string;
  startAt: Date;
  endAt: Date;
  description?: string;
};

export type CreateEventResult = {
  uid: string;
  teleMostUrl: string | null;
  calUrl: string;
};

export async function createEventWithTelemost(
  accessToken: string,
  login: string,
  event: CreateEventOptions
): Promise<CreateEventResult> {
  const uid = `${randomUUID()}@sobes.app`;
  const calUrl = `${CALDAV_BASE}/calendars/${login}/events-default/${uid}.ics`;

  const ics = buildICS({ uid, ...event });

  const putRes = await fetch(calUrl, {
    method: "PUT",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      "Content-Type": "text/calendar; charset=utf-8",
      "If-None-Match": "*",
    },
    body: ics,
  });

  if (!putRes.ok && putRes.status !== 201 && putRes.status !== 204) {
    const text = await putRes.text();
    throw new Error(`CalDAV PUT failed: ${putRes.status} ${text.slice(0, 300)}`);
  }

  // GET the created event — Yandex populates X-TELEMOST-CONFERENCE with the real URL
  const getRes = await fetch(calUrl, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });

  let teleMostUrl: string | null = null;
  if (getRes.ok) {
    teleMostUrl = extractTeleMostUrl(await getRes.text());
  }

  return { uid, teleMostUrl, calUrl };
}

function buildICS(event: {
  uid: string;
  title: string;
  startAt: Date;
  endAt: Date;
  description?: string;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:.]/g, "").slice(0, 15);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sobes//Sobes MVP//RU",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${fmt(new Date())}Z`,
    `DTSTART:${fmt(event.startAt)}Z`,
    `DTEND:${fmt(event.endAt)}Z`,
    `SUMMARY:${escapeIcal(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcal(event.description)}`);
  }

  // Запрос автогенерации Telemost-конференции
  lines.push("X-TELEMOST-CONFERENCE:1");
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

function escapeIcal(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function extractTeleMostUrl(ics: string): string | null {
  // Несколько возможных имён свойства в ответе Яндекса
  const patterns = [
    /^X-TELEMOST-CONFERENCE[^:\r\n]*:([^\r\n]+)/m,
    /^CONFERENCE[^:\r\n]*:([^\r\n]+)/m,
    /^X-WR-TELEMOST-CONFERENCE[^:\r\n]*:([^\r\n]+)/m,
  ];

  for (const pattern of patterns) {
    const m = ics.match(pattern);
    if (m) {
      const val = m[1].trim();
      if (val.startsWith("https://telemost.yandex.ru")) return val;
    }
  }

  // Fallback — любой URL telemost.yandex.ru в теле
  const urlMatch = ics.match(/https:\/\/telemost\.yandex\.ru\/j\/[^\s\r\n\\]+/);
  return urlMatch ? urlMatch[0] : null;
}
