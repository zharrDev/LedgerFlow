function localeOf(language: "en" | "id") {
  return language === "id" ? "id-ID" : "en-US";
}

export function formatDate(language: "en" | "id", iso: string) {
  return new Date(iso).toLocaleDateString(localeOf(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(language: "en" | "id", iso: string) {
  return new Date(iso).toLocaleDateString(localeOf(language), {
    day: "2-digit",
    month: "short",
  });
}

export function formatDateTime(language: "en" | "id", iso: string) {
  return new Date(iso).toLocaleDateString(localeOf(language), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateFull(language: "en" | "id", iso: string) {
  return new Date(iso).toLocaleDateString(localeOf(language), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatNumber(language: "en" | "id", n: number) {
  return new Intl.NumberFormat(localeOf(language)).format(n);
}
