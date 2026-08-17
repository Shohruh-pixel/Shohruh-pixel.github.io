const minutesAgo = (value) => {
  const timestamp = new Date();
  timestamp.setMinutes(timestamp.getMinutes() - value);
  return timestamp;
};

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
    limits: [
      {
        cardName: "Visa Gold",
        cardType: "Visa",
        dailyLimit: "15 000 TJS",
        monthlyLimit: "220 000 TJS",
        commission: "0%",
        ownAtmNote: "0%",
        otherAtmNote: "1.2%, min 15 TJS",
        abroadNote: "2%, bank + ATM fee",
        noteRu: "Лимит зависит от тарифа и может быть увеличен по заявке.",
        noteTj: "Махдудият аз тарофа вобаста буда, бо дархост зиёд шуда метавонад.",
        noteUz: "Limit tarifga bog'liq va ariza bilan oshirilishi mumkin.",
        updatedAt: minutesAgo(30)
      },
      {
        cardName: "Humo Premium",
        cardType: "Humo",
        dailyLimit: "10 000 TJS",
        monthlyLimit: "150 000 TJS",
        commission: "0.8%",
        ownAtmNote: "0%",
        otherAtmNote: "0.8%, min 10 TJS",
        abroadNote: "Not supported",
        noteRu: "Для Humo за рубежом операции могут быть ограничены.",
        noteTj: "Барои Humo амалиёт дар хориҷ метавонад маҳдуд бошад.",
        noteUz: "Humo kartalari uchun xorijdagi operatsiyalar cheklanishi mumkin.",
        updatedAt: minutesAgo(42)
      }
    ]
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
    limits: [
      {
        cardName: "Mastercard World",
        cardType: "Mastercard",
        dailyLimit: "18 000 TJS",
        monthlyLimit: "280 000 TJS",
        commission: "1%",
        ownAtmNote: "0%",
        otherAtmNote: "1%, min 20 TJS",
        abroadNote: "2.2%, plus operator fee",
        noteRu: "Для премиальных карт доступны расширенные лимиты.",
        noteTj: "Барои кортҳои премиум лимитҳои васеъ дастрасанд.",
        noteUz: "Premium kartalar uchun kengaytirilgan limitlar mavjud.",
        updatedAt: minutesAgo(55)
      },
      {
        cardName: "Visa Classic",
        cardType: "Visa",
        dailyLimit: "9 000 TJS",
        monthlyLimit: "120 000 TJS",
        commission: "0%",
        ownAtmNote: "0%",
        otherAtmNote: "1.5%, min 20 TJS",
        abroadNote: "2.5%, bank + ATM fee",
        noteRu: "Проверьте лимиты в приложении банка перед поездкой.",
        noteTj: "Пеш аз сафар лимитҳоро дар барномаи бонк санҷед.",
        noteUz: "Safardan oldin limitlarni bank ilovasida tekshiring.",
        updatedAt: minutesAgo(64)
      }
    ]
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
    limits: [
      {
        cardName: "Corti Milli",
        cardType: "National",
        dailyLimit: "8 000 TJS",
        monthlyLimit: "90 000 TJS",
        commission: "0%",
        ownAtmNote: "0%",
        otherAtmNote: "1%, min 10 TJS",
        abroadNote: "Not available",
        noteRu: "Национальные карты чаще используются внутри страны.",
        noteTj: "Кортҳои миллӣ бештар дар дохили кишвар истифода мешаванд.",
        noteUz: "Milliy kartalar asosan mamlakat ichida ishlatiladi.",
        updatedAt: minutesAgo(80)
      },
      {
        cardName: "Visa Platinum",
        cardType: "Visa",
        dailyLimit: "20 000 TJS",
        monthlyLimit: "320 000 TJS",
        commission: "1.1%",
        ownAtmNote: "0%",
        otherAtmNote: "1.1%, min 20 TJS",
        abroadNote: "2%, plus ATM fee",
        noteRu: "Премиальные лимиты согласуются отдельно для зарплатных клиентов.",
        noteTj: "Лимитҳои премиум барои муштариёни маошӣ алоҳида тасдиқ мешаванд.",
        noteUz: "Premium limitlar maosh mijozlari uchun alohida tasdiqlanadi.",
        updatedAt: minutesAgo(87)
      }
    ]
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
    limits: [
      {
        cardName: "Visa Infinite",
        cardType: "Visa",
        dailyLimit: "25 000 TJS",
        monthlyLimit: "450 000 TJS",
        commission: "0.7%",
        ownAtmNote: "0%",
        otherAtmNote: "0.7%, min 20 TJS",
        abroadNote: "1.8%, plus ATM fee",
        noteRu: "По премиальным картам доступен персональный менеджер.",
        noteTj: "Барои кортҳои премиум менеҷери шахсӣ дастрас аст.",
        noteUz: "Premium kartalar uchun shaxsiy menejer mavjud.",
        updatedAt: minutesAgo(22)
      },
      {
        cardName: "Mastercard Standard",
        cardType: "Mastercard",
        dailyLimit: "11 000 TJS",
        monthlyLimit: "160 000 TJS",
        commission: "0%",
        ownAtmNote: "0%",
        otherAtmNote: "1.4%, min 15 TJS",
        abroadNote: "2.3%, bank + ATM fee",
        noteRu: "Комиссия может отличаться для виртуальных карт.",
        noteTj: "Комиссия барои кортҳои виртуалӣ метавонад фарқ кунад.",
        noteUz: "Virtual kartalar uchun komissiya farq qilishi mumkin.",
        updatedAt: minutesAgo(31)
      }
    ]
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
    limits: [
      {
        cardName: "Visa Signature",
        cardType: "Visa",
        dailyLimit: "22 000 TJS",
        monthlyLimit: "360 000 TJS",
        commission: "0.5%",
        ownAtmNote: "0%",
        otherAtmNote: "0.5%, min 15 TJS",
        abroadNote: "1.9%, plus ATM fee",
        noteRu: "Держателям Signature часто доступны спецпредложения.",
        noteTj: "Барои корти Signature аксаран пешниҳодҳои махсус мавҷуданд.",
        noteUz: "Signature kartalari uchun maxsus takliflar tez-tez bo'ladi.",
        updatedAt: minutesAgo(15)
      },
      {
        cardName: "Humo Standard",
        cardType: "Humo",
        dailyLimit: "7 500 TJS",
        monthlyLimit: "95 000 TJS",
        commission: "0%",
        ownAtmNote: "0%",
        otherAtmNote: "1.3%, min 10 TJS",
        abroadNote: "Not supported",
        noteRu: "Уточняйте доступность снятия по Humo в сторонних банкоматах.",
        noteTj: "Дастрасии гирифтани маблағро бо Humo дар банкоматҳои дигар санҷед.",
        noteUz: "Humo uchun boshqa bankomatlardagi yechib olish shartlarini aniqlang.",
        updatedAt: minutesAgo(25)
      }
    ]
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
    limits: [
      {
        cardName: "Visa Business",
        cardType: "Visa",
        dailyLimit: "17 000 TJS",
        monthlyLimit: "260 000 TJS",
        commission: "1.2%",
        ownAtmNote: "0%",
        otherAtmNote: "1.2%, min 20 TJS",
        abroadNote: "2.4%, plus ATM fee",
        noteRu: "Для бизнес-карт лимиты зависят от типа счета.",
        noteTj: "Барои кортҳои бизнес лимит аз намуди ҳисоб вобаста аст.",
        noteUz: "Biznes kartalar limiti hisob turiga bog'liq.",
        updatedAt: minutesAgo(36)
      },
      {
        cardName: "Mastercard World Elite",
        cardType: "Mastercard",
        dailyLimit: "28 000 TJS",
        monthlyLimit: "500 000 TJS",
        commission: "0.6%",
        ownAtmNote: "0%",
        otherAtmNote: "0.6%, min 25 TJS",
        abroadNote: "1.7%, plus ATM fee",
        noteRu: "Премиальные тарифы уточняются в персональном обслуживании.",
        noteTj: "Тарифҳои премиум дар хизматрасонии шахсӣ мушаххас мешаванд.",
        noteUz: "Premium tariflar shaxsiy xizmatda aniqlashtiriladi.",
        updatedAt: minutesAgo(48)
      }
    ]
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

async function seedDatabase(prisma, options = {}) {
  const { reset = false } = options;

  if (reset) {
    await prisma.withdrawalLimit.deleteMany();
    await prisma.exchangeRate.deleteMany();
    await prisma.bank.deleteMany();
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

