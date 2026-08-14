const localeFieldMap = {
  ru: "nameRu",
  tj: "nameTj",
  uz: "nameUz"
};

export function getBankName(bank, locale = "ru") {
  if (!bank) {
    return "";
  }

  return bank[localeFieldMap[locale]] || bank.nameRu || bank.shortName || "";
}

export function getBankInitials(bank) {
  if (!bank) {
    return "BT";
  }

  if (bank.logo) {
    return bank.logo;
  }

  const source = bank.shortName || getBankName(bank, "ru");
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function bankMatchesSearch(bank, query) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const haystack = [bank.nameRu, bank.nameTj, bank.nameUz, bank.shortName, bank.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

