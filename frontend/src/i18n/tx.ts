export function tx(language: "en" | "id", en: string, id: string) {
  return language === "id" ? id : en;
}
