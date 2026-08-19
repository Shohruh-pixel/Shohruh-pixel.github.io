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

// Rates are not seeded either. Six banks used to carry placeholder figures here — 10.89 for the
// dollar against a market at 9.20, under source labels like "Mobile branch desk" and "Cash office
// rate" that name no real place. They were invisible in practice because CI seeds, then restores the
// snapshot, then scrapes, so every one of them was overwritten within seconds.
//
// Invisible until the day it is not. A failed snapshot import or a scrape that finds nothing would
// have published them, and they look exactly like real rates — a plausible number under a plausible
// source is the one thing this site must never show. The same argument removed the invented
// withdrawal limits; it applies here with more force, because a wrong rate is the whole product
// being wrong.
//
// Nothing is lost by their absence. A bank with its own source is scraped within seconds of boot,
// every other bank comes from the National Bank's table, and the snapshot carries the last known
// figures across builds.

const banks = [
  {
    slug: "alif-bank",
    nameRu: "Алиф Банк",
    nameTj: "Бонки Алиф",
    nameUz: "Alif Bank",
    shortName: "ALF",
    logo: "A",
    isActive: true,
  },
  {
    slug: "orienbank",
    nameRu: "Ориёнбанк",
    nameTj: "Ориёнбонк",
    nameUz: "Orienbank",
    shortName: "ORB",
    logo: "O",
    isActive: true,
  },
  {
    slug: "amonatbank",
    nameRu: "Амонатбанк",
    nameTj: "Амонатбонк",
    nameUz: "Amonatbank",
    shortName: "AMN",
    logo: "AM",
    isActive: true,
  },
  {
    slug: "eskhata-bank",
    nameRu: "Эсхата Банк",
    nameTj: "Бонки Эсхата",
    nameUz: "Eskhata Bank",
    shortName: "ESK",
    logo: "E",
    isActive: true,
  },
  {
    slug: "spitamen-bank",
    nameRu: "Спитамен Банк",
    nameTj: "Бонки Спитамен",
    nameUz: "Spitamen Bank",
    shortName: "SPB",
    logo: "S",
    isActive: true,
  },
  {
    slug: "dushanbe-city-bank",
    nameRu: "Душанбе Сити Банк",
    nameTj: "Бонки Душанбе Сити",
    nameUz: "Dushanbe City Bank",
    shortName: "DCB",
    logo: "DC",
    isActive: true,
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
  // Found through the sites' own sitemaps rather than by following links — two banks keep their card
  // pages outside the navigation, where the earlier crawls could not reach them.
  //
  // https://zudamal.tj/ru/karti/ on 19.08.2026. Three facts and no limits; the percentages elsewhere
  // on their site are loan rates, which belong to a different question.
  zudamal: [
    {
      cardName: "Корти Милли",
      cardType: "Корти Милли",
      facts: [
        { value: "Бесплатно", label: "оформление карты" },
        { value: "Бесплатно", label: "обслуживание дебетовой карты" },
        { value: "30 сомони в год", label: "СМС-оповещение" }
      ]
    }
  ],

  // https://eskhata.com/card/korti-milli/ on 19.08.2026. The bank states the term and nothing else
  // about money, so the term is all that is recorded — one true line rather than a card padded out
  // to look as informative as its neighbours.
  "eskhata-bank": [
    {
      cardName: "Корти Милли",
      cardType: "Корти Милли",
      facts: [
        { value: "До 5 лет", label: "срок действия персонифицированной карты" },
        { value: "18 месяцев", label: "срок действия неперсонифицированной карты" }
      ]
    }
  ],
  // Read from the card pages under https://alif.tj/ru/cards on 19.08.2026 — one page per card, four
  // facts each, quoted as the page states them.
  //
  // Alif also publishes a tariff PDF with the daily withdrawal limits in it, and it is not used. Its
  // text extracts with the Cyrillic row labels missing: the numbers survive and the words naming
  // them do not, so every figure would have to be matched to a row by guessing which one it belongs
  // to. Numbers about money, assigned by guesswork, is the thing this screen was cleaned out for.
  "alif-bank": [
    {
      cardName: "Visa Gold",
      cardType: "Visa",
      facts: [
        { value: "Бесплатно", label: "первая карта, если нет Visa Platinum, Infinite или Mastercard" },
        { value: "От 200 сомони в месяц", label: "оплат — и обслуживание бесплатно после первого года" },
        { value: "До 7 лет", label: "срок действия" },
        { value: "С / ₽ / $", label: "валюты счёта" }
      ]
    },
    {
      cardName: "Visa Platinum",
      cardType: "Visa",
      facts: [
        { value: "300 сомони", label: "стоимость карты" },
        { value: "От 500 сомони в месяц", label: "оплат — и обслуживание бесплатно после первого года" },
        { value: "До 7 лет", label: "срок действия" },
        { value: "С / ₽ / $", label: "валюты счёта" }
      ]
    },
    {
      cardName: "Visa Infinite",
      cardType: "Visa",
      facts: [
        { value: "2 000 сомони", label: "первая карта, дополнительная — 2 500" },
        { value: "От 5 000 сомони в месяц", label: "оплат — и обслуживание бесплатно после первого года" },
        { value: "До 7 лет", label: "срок действия" },
        { value: "С / ₽ / $", label: "валюты счёта" }
      ]
    },
    {
      cardName: "Mastercard Platinum",
      cardType: "Mastercard",
      facts: [
        { value: "Бесплатно", label: "первая карта, если нет других карт Visa или Mastercard" },
        { value: "От 500 сомони в месяц", label: "оплат — и обслуживание бесплатно после первого года" },
        { value: "До 7 лет", label: "срок действия" },
        { value: "С / $ / €", label: "валюты счёта" }
      ]
    },
    {
      cardName: "Visa Business",
      cardType: "Visa",
      facts: [
        { value: "Бесплатно", label: "первая карта, дополнительная — 100 сомони" },
        { value: "От 500 сомони в месяц", label: "оплат — и обслуживание бесплатно после первого года" },
        { value: "До 5 лет", label: "срок действия" },
        { value: "С / € / $", label: "валюты счёта" }
      ]
    }
  ],
  // Read from https://www.spitamenbank.tj/ru/personal/products/cards/ on 19.08.2026. The bank shows
  // three highlights per card and they are not all of a kind — a withdrawal ceiling, a fee, the cost
  // of the card — so each is stored as the pair the page prints, value beside label, rather than
  // sorted into columns that would rename them. Cards whose highlights say nothing about money
  // (concierge service, lounge visits) are left out: they are real, and they are not what someone
  // comes to this screen for.
  "spitamen-bank": [
    {
      cardName: "UPI Gold / Корти Милли",
      cardType: "UnionPay",
      facts: [
        { value: "До 10 000 сомони", label: "обналичивание за рубежом" },
        { value: "Без комиссии", label: "оплата товаров и услуг" },
        { value: "Бесплатно", label: "обслуживание до 5 лет" }
      ]
    },
    {
      cardName: "UPI Platinum / Корти Милли",
      cardType: "UnionPay",
      facts: [
        { value: "До 50 000 сомони", label: "оплата товаров и услуг" },
        { value: "Без ограничений", label: "обналичивание на территории РТ" },
        { value: "20 сомони", label: "выпуск карты" }
      ]
    },
    {
      cardName: "Visa Gold",
      cardType: "Visa",
      facts: [
        { value: "До 20 000 сомони", label: "обналичивание за рубежом" },
        { value: "Без ограничений", label: "обналичивание на территории РТ" },
        { value: "15 сомони", label: "выпуск карты" }
      ]
    },
    {
      cardName: "UPI Classic / Корти Милли",
      cardType: "UnionPay",
      facts: [
        { value: "Всего 1%", label: "обналичивание за рубежом" },
        { value: "Без комиссии", label: "обналичивание на территории РТ" },
        { value: "Бесплатно", label: "обслуживание до 5 лет" }
      ]
    },
    {
      cardName: "Visa Classic",
      cardType: "Visa",
      facts: [
        { value: "Без комиссии", label: "обналичивание на территории РТ" },
        { value: "Без комиссии", label: "онлайн покупки" },
        { value: "Бесплатно", label: "обслуживание до 5 лет" }
      ]
    }
  ],
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


// What each bank says about exchanging currency without coming in. Read on 19.08.2026 from the pages
// named beside each entry; every bank on this list is quoted, none is inferred.
//
// Only Alif says anything. The other ten read directly are silent on it, and their absence here is
// the honest rendering of that — a blank means nobody has claimed anything, not that the answer is
// no.
//
// Alif's is worded carefully because the service is not what it first looks like: the app is a
// marketplace where two people meet at a rate one of them named, inside limits the bank sets. It is
// not the bank selling at the rate this site shows for it, and saying "exchange in the app at 9,22"
// would be wrong in a way that costs somebody money.
//   https://alif.tj/ru/currencyexchange
//   https://alif.tj/ru/bank/news/v-prilozhenii-alif-teper-mozhno-obmenivat-valyutu
const publishedOnline = {
  "alif-bank": {
    onlineRu:
      "Обмен в приложении, круглосуточно, без визита в банк — до 10 000 $ за сделку, комиссия 0,1%. Курс вы назначаете сами в рамках банка: это биржа заявок между людьми, а не курс кассы. Нужна карта Visa или Mastercard либо валютный счёт.",
    onlineTj:
      "Мубодила дар барнома, шабонарӯзӣ, бе рафтан ба бонк — то 10 000 $ дар як амалиёт, комиссия 0,1%. Қурбро худатон дар доираи бонк таъин мекунед: ин мубодилаи байни одамон аст, на қурби касса. Корти Visa ё Mastercard ё ҳисоби асъорӣ лозим аст.",
    onlineUz:
      "Ilovada ayirboshlash, kechayu kunduz, bankka bormasdan — bir amaliyotda 10 000 $ gacha, komissiya 0,1%. Kursni bank belgilagan doirada o'zingiz tanlaysiz: bu odamlar o'rtasidagi birja, kassa kursi emas. Visa yoki Mastercard kartasi yoxud valyuta hisobi kerak."
  }
};

async function seedDatabase(prisma, options = {}) {
  const { reset = false } = options;

  if (reset) {
    await prisma.withdrawalLimit.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.bank.deleteMany();
  }

  for (const entry of banks) {
    const { limits, ...bankData } = entry;

    const bank = await prisma.bank.upsert({
      where: { slug: bankData.slug },
      update: bankData,
      create: bankData
    });

    if (limits && limits.length) {
      await prisma.withdrawalLimit.deleteMany({ where: { bankId: bank.id } });
      await prisma.withdrawalLimit.createMany({
        data: limits.map((limit) => ({ ...limit, bankId: bank.id }))
      });
    }
  }

  // After the banks exist. With reset the table is cleared at the top of this function and every
  // bank with it, so anything looked up before they are recreated finds nothing and is skipped in
  // silence — which is what happened, and a local run without reset hid it.
  for (const [slug, note] of Object.entries(publishedOnline)) {
    await prisma.bank.updateMany({ where: { slug }, data: note });
  }

  for (const [slug, limits] of Object.entries(publishedLimits)) {
    const bank = await prisma.bank.findUnique({ where: { slug }, select: { id: true } });
    if (!bank) {
      continue;
    }
    for (const raw of limits) {
      // SQLite has no JSON column and the shape is only ever read back at render time, so the pairs
      // travel as text rather than earning a table of their own.
      const limit = raw.facts ? { ...raw, facts: JSON.stringify(raw.facts) } : raw;
      const existing = await prisma.withdrawalLimit.findFirst({ where: { bankId: bank.id, cardName: limit.cardName } });
      if (existing) {
        await prisma.withdrawalLimit.update({ where: { id: existing.id }, data: limit });
      } else {
        await prisma.withdrawalLimit.create({ data: { bankId: bank.id, ...limit } });
      }
    }
  }

  return prisma.bank.count();
}

module.exports = {
  banks,
  seedDatabase
};

