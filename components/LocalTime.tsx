"use client";

export function LocalTime({
  iso,
  options,
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  };
  return <>{new Date(iso).toLocaleString("ru-RU", options ?? defaultOptions)}</>;
}
