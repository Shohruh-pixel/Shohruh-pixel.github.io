const minutesAgo = (value) => {
  const timestamp = new Date();
  timestamp.setMinutes(timestamp.getMinutes() - value);
  return timestamp;
};

// Withdrawal limits are not seeded, and the ones that used to be here have been removed. They were
// written alongside placeholder rates — the same objects carried usdBuy 10.89 from a source called
// "Mobile branch desk" — and where the rates were overwritten by the scraper within seconds of boot,
// nothing ever overwrote the limits. So twelve invented figures sat on the live site for months:
// daily allowances, monthly ceilings and ATM commissions that no bank ever published.
//
// Checked before removing them: no bank in this country publishes its withdrawal limits anywhere a
// machine can read, and several do not publish them at all. There is nothing to replace these with,
// which is the answer — the file already said so about the banks added later, and the rule simply
// had not been applied backwards to the first six.

const banks = [
  {
    slug: "alif-bank",
    nameRu: "Алиф Банк",
    nameTj: "Бонки Алиф",
    nameUz: "Alif Bank",
    shortName: "ALF",
    logo: "A",
    isActive: true,
    rate: {
      usdBuy: 10.89,
      usdSell: 10.94,
      rubBuy: 0.1169,
      rubSell: 0.1182,
      eurBuy: 11.79,
      eurSell: 11.92,
      sourceLabel: "Mobile branch desk",
      updatedAt: minutesAgo(9)
    },
  },
  {
    slug: "orienbank",
    nameRu: "Ориёнбанк",
    nameTj: "Ориёнбонк",
    nameUz: "Orienbank",
    shortName: "ORB",
    logo: "O",
    isActive: true,
    rate: {
      usdBuy: 10.91,
      usdSell: 10.97,
      rubBuy: 0.1171,
      rubSell: 0.1184,
      eurBuy: 11.82,
      eurSell: 11.96,
      sourceLabel: "Cash office rate",
      updatedAt: minutesAgo(14)
    },
  },
  {
    slug: "amonatbank",
    nameRu: "Амонатбанк",
    nameTj: "Амонатбонк",
    nameUz: "Amonatbank",
    shortName: "AMN",
    logo: "AM",
    isActive: true,
    rate: {
      usdBuy: 10.85,
      usdSell: 10.92,
      rubBuy: 0.1165,
      rubSell: 0.1179,
      eurBuy: 11.74,
      eurSell: 11.89,
      sourceLabel: "Retail branch rate",
      updatedAt: minutesAgo(18)
    },
  },
  {
    slug: "eskhata-bank",
    nameRu: "Эсхата Банк",
    nameTj: "Бонки Эсхата",
    nameUz: "Eskhata Bank",
    shortName: "ESK",
    logo: "E",
    isActive: true,
    rate: {
      usdBuy: 10.9,
      usdSell: 10.93,
      rubBuy: 0.1172,
      rubSell: 0.1181,
      eurBuy: 11.8,
      eurSell: 11.9,
      sourceLabel: "Digital channel rate",
      updatedAt: minutesAgo(6)
    },
  },
  {
    slug: "spitamen-bank",
    nameRu: "Спитамен Банк",
    nameTj: "Бонки Спитамен",
    nameUz: "Spitamen Bank",
    shortName: "SPB",
    logo: "S",
    isActive: true,
    rate: {
      usdBuy: 10.88,
      usdSell: 10.91,
      rubBuy: 0.1168,
      rubSell: 0.1178,
      eurBuy: 11.77,
      eurSell: 11.87,
      sourceLabel: "Branch and app blended rate",
      updatedAt: minutesAgo(4)
    },
  },
  {
    slug: "dushanbe-city-bank",
    nameRu: "Душанбе Сити Банк",
    nameTj: "Бонки Душанбе Сити",
    nameUz: "Dushanbe City Bank",
    shortName: "DCB",
    logo: "DC",
    isActive: true,
    rate: {
      usdBuy: 10.87,
      usdSell: 10.9,
      rubBuy: 0.1166,
      rubSell: 0.1177,
      eurBuy: 11.76,
      eurSell: 11.85,
      sourceLabel: "City branch desk",
      updatedAt: minutesAgo(12)
    },
  }
];

// Added after the original six, once their own published rates were located. Each has a working
// source, so none of them needs a seeded rate — the scraper writes real figures on the first run.
// Withdrawal limits are absent because nobody has collected the real ones; the limits page simply
// does not list these banks until somebody does.
const laterBanks = [
  {
    slug: "humo",
    nameRu: "Хумо",
    nameTj: "Ҳумо",
    nameUz: "Humo",
    shortName: "HUM",
    logo: "H",
    isActive: true
  },
  {
    slug: "imon-international",
    nameRu: "Имон Интернешнл",
    nameTj: "Имон Интернешнл",
    nameUz: "Imon International",
    shortName: "IMN",
    logo: "I",
    isActive: true
  },
  {
    slug: "arvand",
    nameRu: "Банк Арванд",
    nameTj: "Бонки Арванд",
    nameUz: "Arvand Bank",
    shortName: "ARV",
    logo: "AR",
    isActive: true
  }
  // Tawhidbank is deliberately not here yet. Its site is an Angular app and its own rate endpoint
  // has not been found, so adding it would create a bank page with no rate — which answers 404 and
  // fails the static build outright. It joins the list the day it has a source.
];

banks.push(...laterBanks);

// Everything else the National Bank publishes. None of these has a reachable source of its own, so
// all of them show the official figure and say so on the card. Nine banks answered "which of the
// ones I know is best"; twenty-three answers "where in the country is best", which is the question
// people actually have.
const nbtOnlyBanks = [
  { slug: "tawhidbank", nameRu: "Тавхидбанк", nameTj: "Тавҳидбонк", nameUz: "Tavhidbank", shortName: "TWD", logo: "T", isActive: true },
  { slug: "mbt", nameRu: "Международный банк Таджикистана", nameTj: "Бонки байналмилалии Тоҷикистон", nameUz: "Tojikiston Xalqaro banki", shortName: "MBT", logo: "MB", isActive: true },
  { slug: "ikb-tajikistan", nameRu: "Инвестиционно-Кредитный Банк", nameTj: "Бонки Сармоягузорӣ-Қарзӣ", nameUz: "Investitsiya-Kredit banki", shortName: "IKB", logo: "IK", isActive: true },
  { slug: "aktiv-bank", nameRu: "Актив Банк", nameTj: "Бонки Актив", nameUz: "Aktiv Bank", shortName: "AKT", logo: "AK", isActive: true },
  { slug: "sanoatsodirotbonk", nameRu: "Саноатсодиротбонк", nameTj: "Саноатсодиротбонк", nameUz: "Sanoatsodirotbonk", shortName: "SSB", logo: "SS", isActive: true },
  { slug: "freedom-bank", nameRu: "Фридом Банк Таджикистан", nameTj: "Бонки Фридом Тоҷикистон", nameUz: "Freedom Bank Tojikiston", shortName: "FRD", logo: "F", isActive: true },
  { slug: "vasl-bank", nameRu: "Васл Банк", nameTj: "Бонки Васл", nameUz: "Vasl Bank", shortName: "VSL", logo: "V", isActive: true },
  { slug: "finca", nameRu: "ФИНКА", nameTj: "ФИНКА", nameUz: "FINCA", shortName: "FIN", logo: "FI", isActive: true },
  { slug: "azizi-moliya", nameRu: "Азизи-Молия", nameTj: "Азизӣ-Молия", nameUz: "Azizi-Moliya", shortName: "AZM", logo: "AZ", isActive: true },
  { slug: "matin", nameRu: "МАТИН", nameTj: "МАТИН", nameUz: "MATIN", shortName: "MAT", logo: "MA", isActive: true },
  { slug: "lols-moliya", nameRu: "ЛОЛС Молия", nameTj: "ЛОЛС Молия", nameUz: "LOLS Moliya", shortName: "LLS", logo: "L", isActive: true },
  { slug: "shukr-moliya", nameRu: "Шукр Молия", nameTj: "Шукр Молия", nameUz: "Shukr Moliya", shortName: "SHK", logo: "SH", isActive: true },
  { slug: "sunduk", nameRu: "Сундук", nameTj: "Сундуқ", nameUz: "Sunduq", shortName: "SND", logo: "SN", isActive: true },
  { slug: "zudamal", nameRu: "Зудамал", nameTj: "Зудамал", nameUz: "Zudamal", shortName: "ZUD", logo: "Z", isActive: true }
];

banks.push(...nbtOnlyBanks);


// The only withdrawal limits any bank in this country publishes where they can be read. Found by
// going through the card and tariff pages of every bank with a reachable site — ten of them — on
// 19.08.2026; Humo answers it in its own FAQ, in these words:
//
//   "Какие лимиты для обналичивания карты?
//    Снятие наличных в банкоматах в неделю – до 50 000 сомони.
//    Выдача наличных в кассах филиалов и агентов Хумо с помощью POS-терминалов – до 100 000 сомони."
//   https://humo.tj/ru/cards
//
// Recorded in the period the bank chose. Everything else is left null rather than estimated: the
// commission, the behaviour at other banks' machines and abroad are not stated anywhere, and a blank
// is the honest rendering of a thing nobody published. Applies to the cards generally — the page does
// not name one — so it is filed that way instead of being attached to a card it might not govern.
const publishedLimits = {
  humo: [
    {
      cardName: "Все карты",
      cardType: "Хумо",
      weeklyLimit: "50 000 TJS",
      counterLimit: "100 000 TJS",
      noteRu: "В банкоматах — за неделю. В кассах филиалов и у агентов Хумо через POS-терминал.",
      noteTj: "Дар банкоматҳо — дар як ҳафта. Дар кассаҳои филиалҳо ва агентҳои Ҳумо тавассути POS-терминал.",
      noteUz: "Bankomatlarda — haftasiga. Filiallar kassalarida va Humo agentlarida POS-terminal orqali."
    }
  ]
};

async function seedDatabase(prisma, options = {}) {
  const { reset = false } = options;

  if (reset) {
    await prisma.withdrawalLimit.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.bank.deleteMany();
  }

  for (const [slug, limits] of Object.entries(publishedLimits)) {
    const bank = await prisma.bank.findUnique({ where: { slug }, select: { id: true } });
    if (!bank) {
      continue;
    }
    for (const limit of limits) {
      const existing = await prisma.withdrawalLimit.findFirst({ where: { bankId: bank.id, cardName: limit.cardName } });
      if (existing) {
        await prisma.withdrawalLimit.update({ where: { id: existing.id }, data: limit });
      } else {
        await prisma.withdrawalLimit.create({ data: { bankId: bank.id, ...limit } });
      }
    }
  }

  for (const entry of banks) {
    const { rate, limits, ...bankData } = entry;

    const bank = await prisma.bank.upsert({
      where: { slug: bankData.slug },
      update: bankData,
      create: bankData
    });

    // Banks added later carry no seed rate and no limits, and that is deliberate rather than
    // unfinished: the scraper fills their rates from the bank's own API within seconds of boot, and
    // nobody here has their real withdrawal limits. Inventing either to make the card look complete
    // would put a number on the site that no bank ever published — the one failure this product
    // cannot have. An empty section is honest; a plausible fabrication is not.
    if (rate) {
      await prisma.exchangeRate.upsert({
        where: { bankId: bank.id },
        update: { ...rate, bankId: bank.id },
        create: { ...rate, bankId: bank.id }
      });
    }

    if (limits && limits.length) {
      await prisma.withdrawalLimit.deleteMany({ where: { bankId: bank.id } });
      await prisma.withdrawalLimit.createMany({
        data: limits.map((limit) => ({ ...limit, bankId: bank.id }))
      });
    }
  }

  return prisma.bank.count();
}

module.exports = {
  banks,
  seedDatabase
};

