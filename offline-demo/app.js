(function () {
  const STORAGE_KEYS = {
    language: "bankrate-offline-language",
    favorites: "bankrate-offline-favorites",
    page: "bankrate-offline-page",
    ratesView: "bankrate-offline-rates-view",
    converter: "bankrate-offline-converter"
  };

  const localeMap = {
    ru: "ru-RU",
    tj: "tg-TJ",
    uz: "uz-UZ"
  };

  const translations = {
    ru: {
      brand: {
        title: "BankRate TJ",
        subtitle: "Офлайн-демо без установки Node.js"
      },
      nav: {
        home: "Главная",
        rates: "Курсы",
        converter: "Конвертер",
        limits: "Лимиты",
        favorites: "Избранное"
      },
      common: {
        lastUpdated: "Последнее обновление",
        updated: "Обновлено",
        buy: "Покупка",
        sell: "Продажа",
        searchBank: "Поиск банка",
        searchCard: "Поиск карты",
        sortBy: "Сортировка",
        cardMode: "Карточки",
        tableMode: "Таблица",
        ownAtms: "Свои банкоматы",
        otherAtms: "Другие банкоматы",
        abroad: "За рубежом",
        dailyLimit: "Дневной лимит",
        monthlyLimit: "Месячный лимит",
        commission: "Комиссия",
        selectedBank: "Выбранный банк",
        amount: "Сумма",
        from: "Из",
        to: "В",
        result: "Результат",
        rateUsed: "Использованный курс",
        source: "Источник",
        noDataFound: "Данные не найдены",
        noCommission: "Без комиссии",
        withCommission: "С комиссией",
        allFees: "Все комиссии",
        allBanks: "Все банки",
        cardType: "Тип карты",
        allCardTypes: "Все типы карт",
        quickAccess: "Быстрый доступ",
        localPreview: "Локальный расчет",
        worksOffline: "Работает полностью офлайн",
        justNow: "только что",
        openRates: "Открыть курсы",
        openConverter: "Открыть конвертер",
        clearFilters: "Сбросить фильтры"
      },
      currencies: {
        TJS: "Таджикский сомони",
        USD: "Доллар США",
        RUB: "Российский рубль",
        EUR: "Евро"
      },
      home: {
        eyebrow: "Ежедневный валютный обзор",
        title: "Сравнивайте лучшие курсы и лимиты банков Таджикистана даже без интернета и установки программ.",
        subtitle:
          "Это автономная демо-версия. Она открывается обычным файлом HTML и хранит язык и избранные банки прямо в браузере.",
        marketTitle: "Рынок сегодня",
        marketSubtitle: "Лучшие предложения по USD, RUB и EUR в одном экране.",
        highlightTitle: "Лучший банк дня",
        quickTitle: "Быстрые сценарии",
        quickSubtitle: "Переходите сразу в нужный раздел без сложной навигации.",
        statBanks: "Активные банки",
        statFavorites: "В избранном",
        statMode: "Режим",
        actionRates: "Курсы валют",
        actionConverter: "Конвертер",
        actionLimits: "Лимиты снятия",
        actionFavorites: "Избранные банки"
      },
      summary: {
        usdBuy: "Лучший курс покупки USD",
        usdSell: "Лучший курс продажи USD",
        rubBuy: "Лучший курс покупки RUB",
        rubSell: "Лучший курс продажи RUB",
        eurBuy: "Лучший курс покупки EUR",
        eurSell: "Лучший курс продажи EUR"
      },
      banner: {
        title: "Лучший банк дня",
        wins: "Лидирует по числу лучших ставок",
        route: "Перейти к курсам"
      },
      rates: {
        title: "Курсы банков",
        subtitle: "Карточки для мобильного просмотра и компактная таблица для быстрого сравнения.",
        searchPlaceholder: "Введите название банка",
        favoriteHint: "Избранные банки автоматически поднимаются вверх.",
        visibility: "Показывать валюты",
        noResultsTitle: "Ничего не найдено",
        noResultsDescription: "Попробуйте изменить поиск, сортировку или выбранные валюты.",
        table: {
          bank: "Банк",
          updated: "Обновлено",
          usdBuy: "USD пок.",
          usdSell: "USD прод.",
          rubBuy: "RUB пок.",
          rubSell: "RUB прод.",
          eurBuy: "EUR пок.",
          eurSell: "EUR прод."
        },
        sortOptions: {
          name: "По названию банка",
          usdBuy: "Лучший USD покупка",
          usdSell: "Лучший USD продажа",
          rubBuy: "Лучший RUB покупка",
          rubSell: "Лучший RUB продажа",
          eurBuy: "Лучший EUR покупка",
          eurSell: "Лучший EUR продажа"
        }
      },
      converter: {
        title: "Конвертер по курсу банка",
        subtitle: "Выберите банк, валютную пару и сумму. Результат появится мгновенно.",
        quickAmounts: "Быстрые суммы",
        swap: "Поменять валюты",
        modeLabel: "Тип курса",
        info: "Расчет идет полностью в браузере по локальным тестовым курсам."
      },
      limits: {
        title: "Лимиты снятия",
        subtitle: "Дневные и месячные лимиты по картам разных банков.",
        disclaimerTitle: "Важно",
        disclaimerBody: "Пожалуйста, уточняйте лимиты в банке. Они могут зависеть от тарифа и типа карты.",
        noResultsTitle: "Лимиты не найдены",
        noResultsDescription: "Измените фильтры и попробуйте снова."
      },
      favorites: {
        title: "Избранные банки",
        subtitle: "Список хранится в localStorage и не исчезает после закрытия браузера.",
        emptyTitle: "Избранное пока пусто",
        emptyDescription: "Добавьте банки в избранное на странице курсов."
      },
      empty: {
        title: "Пока пусто",
        description: "Данные появятся после выбора другого фильтра."
      },
      mode: {
        offline: "Офлайн"
      }
    },
    tj: {
      brand: {
        title: "BankRate TJ",
        subtitle: "Нусхаи офлайн бе Node.js"
      },
      nav: {
        home: "Асосӣ",
        rates: "Қурбҳо",
        converter: "Табдилгар",
        limits: "Лимитҳо",
        favorites: "Баргузида"
      },
      common: {
        lastUpdated: "Навсозии охирин",
        updated: "Нав шуд",
        buy: "Харид",
        sell: "Фурӯш",
        searchBank: "Ҷустуҷӯи бонк",
        searchCard: "Ҷустуҷӯи корт",
        sortBy: "Тартиб",
        cardMode: "Кортҳо",
        tableMode: "Ҷадвал",
        ownAtms: "Банкоматҳои худӣ",
        otherAtms: "Банкоматҳои дигар",
        abroad: "Дар хориҷ",
        dailyLimit: "Лимити рӯзона",
        monthlyLimit: "Лимити моҳона",
        commission: "Комиссия",
        selectedBank: "Бонки интихобшуда",
        amount: "Маблағ",
        from: "Аз",
        to: "Ба",
        result: "Натиҷа",
        rateUsed: "Қурби истифодашуда",
        source: "Манбаъ",
        noDataFound: "Маълумот ёфт нашуд",
        noCommission: "Бе комиссия",
        withCommission: "Бо комиссия",
        allFees: "Ҳама комиссияҳо",
        allBanks: "Ҳама бонкҳо",
        cardType: "Навъи корт",
        allCardTypes: "Ҳама намудҳои корт",
        quickAccess: "Дастрасии зуд",
        localPreview: "Ҳисоби маҳаллӣ",
        worksOffline: "Комилан офлайн кор мекунад",
        justNow: "ҳозир",
        openRates: "Кушодани қурбҳо",
        openConverter: "Кушодани табдилгар",
        clearFilters: "Тоза кардани филтрҳо"
      },
      currencies: {
        TJS: "Сомонии тоҷикӣ",
        USD: "Доллари ИМА",
        RUB: "Рубли русӣ",
        EUR: "Евро"
      },
      home: {
        eyebrow: "Шарҳи ҳаррӯзаи асъор",
        title: "Қурбҳо ва лимитҳои беҳтарини бонкҳои Тоҷикистонро ҳатто бе интернет ва бе насби барнома бинед.",
        subtitle:
          "Ин нусхаи автономӣ аст. Он ҳамчун файли оддии HTML кушода мешавад ва забон ва баргузидаро дар браузер нигоҳ медорад.",
        marketTitle: "Бозори имрӯз",
        marketSubtitle: "Пешниҳодҳои беҳтарин барои USD, RUB ва EUR дар як экран.",
        highlightTitle: "Бонки беҳтарини рӯз",
        quickTitle: "Сенарияҳои зуд",
        quickSubtitle: "Бе навигатсияи душвор мустақим ба қисми лозима гузаред.",
        statBanks: "Бонкҳои фаъол",
        statFavorites: "Дар баргузида",
        statMode: "Режим",
        actionRates: "Қурбҳои асъор",
        actionConverter: "Табдилгар",
        actionLimits: "Лимитҳои гирифтани нақд",
        actionFavorites: "Бонкҳои баргузида"
      },
      summary: {
        usdBuy: "Беҳтарин қурби хариди USD",
        usdSell: "Беҳтарин қурби фурӯши USD",
        rubBuy: "Беҳтарин қурби хариди RUB",
        rubSell: "Беҳтарин қурби фурӯши RUB",
        eurBuy: "Беҳтарин қурби хариди EUR",
        eurSell: "Беҳтарин қурби фурӯши EUR"
      },
      banner: {
        title: "Бонки беҳтарини рӯз",
        wins: "Пешсаф аз рӯи шумораи қурбҳои беҳтарин",
        route: "Гузариш ба қурбҳо"
      },
      rates: {
        title: "Қурбҳои бонкҳо",
        subtitle: "Кортҳо барои телефон ва ҷадвали фишурда барои муқоисаи зуд.",
        searchPlaceholder: "Номи бонкро ворид кунед",
        favoriteHint: "Бонкҳои баргузида худкор боло мебароянд.",
        visibility: "Асъорҳои намоишшаванда",
        noResultsTitle: "Чизе ёфт нашуд",
        noResultsDescription: "Ҷустуҷӯ, тартиб ё асъорҳоро иваз кунед.",
        table: {
          bank: "Бонк",
          updated: "Нав шуд",
          usdBuy: "USD хар.",
          usdSell: "USD фур.",
          rubBuy: "RUB хар.",
          rubSell: "RUB фур.",
          eurBuy: "EUR хар.",
          eurSell: "EUR фур."
        },
        sortOptions: {
          name: "Аз рӯи номи бонк",
          usdBuy: "Беҳтарин USD харид",
          usdSell: "Беҳтарин USD фурӯш",
          rubBuy: "Беҳтарин RUB харид",
          rubSell: "Беҳтарин RUB фурӯш",
          eurBuy: "Беҳтарин EUR харид",
          eurSell: "Беҳтарин EUR фурӯш"
        }
      },
      converter: {
        title: "Табдилгар аз рӯи қурби бонк",
        subtitle: "Бонк, ҷуфти асъор ва маблағро интихоб кунед. Натиҷа фавран пайдо мешавад.",
        quickAmounts: "Маблағҳои зуд",
        swap: "Иваз кардани асъорҳо",
        modeLabel: "Навъи қурб",
        info: "Ҳисоб пурра дар браузер аз рӯи қурбҳои маҳаллии санҷишӣ анҷом меёбад."
      },
      limits: {
        title: "Лимитҳои гирифтани нақд",
        subtitle: "Лимитҳои рӯзона ва моҳона барои кортҳои бонкҳои гуногун.",
        disclaimerTitle: "Муҳим",
        disclaimerBody: "Лутфан лимитҳоро аз бонк санҷед. Онҳо метавонанд аз тарофа ва намуди корт вобаста бошанд.",
        noResultsTitle: "Лимитҳо ёфт нашуданд",
        noResultsDescription: "Филтрҳоро иваз кунед ва дубора кӯшиш намоед."
      },
      favorites: {
        title: "Бонкҳои баргузида",
        subtitle: "Рӯйхат дар localStorage нигоҳ дошта мешавад ва баъди бастани браузер гум намешавад.",
        emptyTitle: "Баргузида ҳоло холӣ аст",
        emptyDescription: "Дар саҳифаи қурбҳо бонкҳоро ба баргузида илова кунед."
      },
      empty: {
        title: "Ҳоло холӣ аст",
        description: "Маълумот баъди интихоби филтри дигар пайдо мешавад."
      },
      mode: {
        offline: "Офлайн"
      }
    },
    uz: {
      brand: {
        title: "BankRate TJ",
        subtitle: "Node.js siz oflayn demo"
      },
      nav: {
        home: "Bosh sahifa",
        rates: "Kurslar",
        converter: "Konverter",
        limits: "Limitlar",
        favorites: "Saralangan"
      },
      common: {
        lastUpdated: "So'nggi yangilanish",
        updated: "Yangilandi",
        buy: "Sotib olish",
        sell: "Sotish",
        searchBank: "Bank qidirish",
        searchCard: "Karta qidirish",
        sortBy: "Saralash",
        cardMode: "Kartalar",
        tableMode: "Jadval",
        ownAtms: "O'z bankomatlari",
        otherAtms: "Boshqa bankomatlar",
        abroad: "Xorijda",
        dailyLimit: "Kunlik limit",
        monthlyLimit: "Oylik limit",
        commission: "Komissiya",
        selectedBank: "Tanlangan bank",
        amount: "Miqdor",
        from: "Dan",
        to: "Ga",
        result: "Natija",
        rateUsed: "Ishlatilgan kurs",
        source: "Manba",
        noDataFound: "Ma'lumot topilmadi",
        noCommission: "Komissiyasiz",
        withCommission: "Komissiyali",
        allFees: "Barcha komissiyalar",
        allBanks: "Barcha banklar",
        cardType: "Karta turi",
        allCardTypes: "Barcha karta turlari",
        quickAccess: "Tezkor kirish",
        localPreview: "Mahalliy hisob",
        worksOffline: "To'liq oflayn ishlaydi",
        justNow: "hozir",
        openRates: "Kurslarni ochish",
        openConverter: "Konverterni ochish",
        clearFilters: "Filtrlarni tozalash"
      },
      currencies: {
        TJS: "Tojik somonisi",
        USD: "AQSh dollari",
        RUB: "Rossiya rubli",
        EUR: "Yevro"
      },
      home: {
        eyebrow: "Kunlik valyuta sharhi",
        title: "Tojikiston banklarining eng yaxshi kurslari va limitlarini hatto internet va dastur o'rnatmasdan ko'ring.",
        subtitle:
          "Bu avtonom demo. U oddiy HTML fayl sifatida ochiladi va til hamda saralangan banklarni brauzerning o'zida saqlaydi.",
        marketTitle: "Bugungi bozor",
        marketSubtitle: "USD, RUB va EUR bo'yicha eng yaxshi takliflar bitta ekranda.",
        highlightTitle: "Kunning eng yaxshi banki",
        quickTitle: "Tezkor ssenariylar",
        quickSubtitle: "Murakkab navigatsiyasiz kerakli bo'limga o'ting.",
        statBanks: "Faol banklar",
        statFavorites: "Saralanganda",
        statMode: "Rejim",
        actionRates: "Valyuta kurslari",
        actionConverter: "Konverter",
        actionLimits: "Naqd yechish limitlari",
        actionFavorites: "Saralangan banklar"
      },
      summary: {
        usdBuy: "Eng yaxshi USD xarid kursi",
        usdSell: "Eng yaxshi USD sotuv kursi",
        rubBuy: "Eng yaxshi RUB xarid kursi",
        rubSell: "Eng yaxshi RUB sotuv kursi",
        eurBuy: "Eng yaxshi EUR xarid kursi",
        eurSell: "Eng yaxshi EUR sotuv kursi"
      },
      banner: {
        title: "Kunning eng yaxshi banki",
        wins: "Eng yaxshi stavkalar soni bo'yicha yetakchi",
        route: "Kurslarga o'tish"
      },
      rates: {
        title: "Bank kurslari",
        subtitle: "Telefon uchun qulay kartalar va tez taqqoslash uchun ixcham jadval.",
        searchPlaceholder: "Bank nomini kiriting",
        favoriteHint: "Saralangan banklar avtomatik ravishda yuqoriga chiqadi.",
        visibility: "Ko'rsatiladigan valyutalar",
        noResultsTitle: "Hech narsa topilmadi",
        noResultsDescription: "Qidiruv, saralash yoki valyutalarni o'zgartirib ko'ring.",
        table: {
          bank: "Bank",
          updated: "Yangilandi",
          usdBuy: "USD xar.",
          usdSell: "USD sot.",
          rubBuy: "RUB xar.",
          rubSell: "RUB sot.",
          eurBuy: "EUR xar.",
          eurSell: "EUR sot."
        },
        sortOptions: {
          name: "Bank nomi bo'yicha",
          usdBuy: "Eng yaxshi USD xarid",
          usdSell: "Eng yaxshi USD sotuv",
          rubBuy: "Eng yaxshi RUB xarid",
          rubSell: "Eng yaxshi RUB sotuv",
          eurBuy: "Eng yaxshi EUR xarid",
          eurSell: "Eng yaxshi EUR sotuv"
        }
      },
      converter: {
        title: "Bank kursi bo'yicha konverter",
        subtitle: "Bankni, valyuta juftligini va miqdorni tanlang. Natija darhol chiqadi.",
        quickAmounts: "Tez summalar",
        swap: "Valyutalarni almashtirish",
        modeLabel: "Kurs turi",
        info: "Hisob to'liq brauzer ichida lokal test kurslari bo'yicha bajariladi."
      },
      limits: {
        title: "Naqd yechish limitlari",
        subtitle: "Turli bank kartalari uchun kunlik va oylik limitlar.",
        disclaimerTitle: "Muhim",
        disclaimerBody: "Iltimos, limitlarni bank bilan tekshiring. Ular tarif va karta turiga bog'liq bo'lishi mumkin.",
        noResultsTitle: "Limitlar topilmadi",
        noResultsDescription: "Filtrlarni o'zgartirib qayta urinib ko'ring."
      },
      favorites: {
        title: "Saralangan banklar",
        subtitle: "Ro'yxat localStorage'da saqlanadi va brauzer yopilgandan keyin ham qoladi.",
        emptyTitle: "Saralanganlar hozircha bo'sh",
        emptyDescription: "Kurslar sahifasida banklarni saralanganlarga qo'shing."
      },
      empty: {
        title: "Hozircha bo'sh",
        description: "Boshqa filtr tanlanganda ma'lumot paydo bo'ladi."
      },
      mode: {
        offline: "Oflayn"
      }
    }
  };

  const banks = [
    {
      id: 1,
      slug: "alif-bank",
      shortName: "ALF",
      logo: "A",
      nameRu: "Алиф Банк",
      nameTj: "Бонки Алиф",
      nameUz: "Alif Bank",
      sourceLabel: {
        ru: "Мобильная касса",
        tj: "Хазинаи мобилӣ",
        uz: "Mobil kassadagi kurs"
      },
      updatedMinutesAgo: 9,
      rates: {
        usdBuy: 10.89,
        usdSell: 10.94,
        rubBuy: 0.1169,
        rubSell: 0.1182,
        eurBuy: 11.79,
        eurSell: 11.92
      },
      limits: [
        {
          id: 101,
          cardName: "Visa Gold",
          cardType: "Visa",
          dailyLimit: "15 000 TJS",
          monthlyLimit: "220 000 TJS",
          commission: "0%",
          ownAtmNote: "0%",
          otherAtmNote: "1.2%, min 15 TJS",
          abroadNote: "2%, bank + ATM fee",
          updatedMinutesAgo: 30,
          noteRu: "Лимит зависит от тарифа и может быть увеличен по заявке.",
          noteTj: "Маҳдудият аз тарофа вобаста буда, бо дархост зиёд шуда метавонад.",
          noteUz: "Limit tarifga bog'liq va ariza bilan oshirilishi mumkin."
        },
        {
          id: 102,
          cardName: "Humo Premium",
          cardType: "Humo",
          dailyLimit: "10 000 TJS",
          monthlyLimit: "150 000 TJS",
          commission: "0.8%",
          ownAtmNote: "0%",
          otherAtmNote: "0.8%, min 10 TJS",
          abroadNote: "Not supported",
          updatedMinutesAgo: 42,
          noteRu: "Для Humo операции за рубежом могут быть ограничены.",
          noteTj: "Барои Humo амалиёт дар хориҷ метавонад маҳдуд бошад.",
          noteUz: "Humo kartalari uchun xorijdagi operatsiyalar cheklanishi mumkin."
        }
      ]
    },
    {
      id: 2,
      slug: "orienbank",
      shortName: "ORB",
      logo: "O",
      nameRu: "Ориёнбанк",
      nameTj: "Ориёнбонк",
      nameUz: "Orienbank",
      sourceLabel: {
        ru: "Касса отделения",
        tj: "Хазинаи шуъба",
        uz: "Filial kassasi"
      },
      updatedMinutesAgo: 14,
      rates: {
        usdBuy: 10.91,
        usdSell: 10.97,
        rubBuy: 0.1171,
        rubSell: 0.1184,
        eurBuy: 11.82,
        eurSell: 11.96
      },
      limits: [
        {
          id: 201,
          cardName: "Mastercard World",
          cardType: "Mastercard",
          dailyLimit: "18 000 TJS",
          monthlyLimit: "280 000 TJS",
          commission: "1%",
          ownAtmNote: "0%",
          otherAtmNote: "1%, min 20 TJS",
          abroadNote: "2.2%, plus operator fee",
          updatedMinutesAgo: 55,
          noteRu: "Для премиальных карт доступны расширенные лимиты.",
          noteTj: "Барои кортҳои премиум лимитҳои васеъ дастрасанд.",
          noteUz: "Premium kartalar uchun kengaytirilgan limitlar mavjud."
        },
        {
          id: 202,
          cardName: "Visa Classic",
          cardType: "Visa",
          dailyLimit: "9 000 TJS",
          monthlyLimit: "120 000 TJS",
          commission: "0%",
          ownAtmNote: "0%",
          otherAtmNote: "1.5%, min 20 TJS",
          abroadNote: "2.5%, bank + ATM fee",
          updatedMinutesAgo: 64,
          noteRu: "Проверьте лимиты в приложении банка перед поездкой.",
          noteTj: "Пеш аз сафар лимитҳоро дар барномаи бонк санҷед.",
          noteUz: "Safardan oldin limitlarni bank ilovasida tekshiring."
        }
      ]
    },
    {
      id: 3,
      slug: "amonatbank",
      shortName: "AMN",
      logo: "AM",
      nameRu: "Амонатбанк",
      nameTj: "Амонатбонк",
      nameUz: "Amonatbank",
      sourceLabel: {
        ru: "Розничная касса",
        tj: "Хазинаи чакана",
        uz: "Chakana kassa"
      },
      updatedMinutesAgo: 18,
      rates: {
        usdBuy: 10.85,
        usdSell: 10.92,
        rubBuy: 0.1165,
        rubSell: 0.1179,
        eurBuy: 11.74,
        eurSell: 11.89
      },
      limits: [
        {
          id: 301,
          cardName: "Corti Milli",
          cardType: "National",
          dailyLimit: "8 000 TJS",
          monthlyLimit: "90 000 TJS",
          commission: "0%",
          ownAtmNote: "0%",
          otherAtmNote: "1%, min 10 TJS",
          abroadNote: "Not available",
          updatedMinutesAgo: 80,
          noteRu: "Национальные карты чаще используются внутри страны.",
          noteTj: "Кортҳои миллӣ бештар дар дохили кишвар истифода мешаванд.",
          noteUz: "Milliy kartalar asosan mamlakat ichida ishlatiladi."
        },
        {
          id: 302,
          cardName: "Visa Platinum",
          cardType: "Visa",
          dailyLimit: "20 000 TJS",
          monthlyLimit: "320 000 TJS",
          commission: "1.1%",
          ownAtmNote: "0%",
          otherAtmNote: "1.1%, min 20 TJS",
          abroadNote: "2%, plus ATM fee",
          updatedMinutesAgo: 87,
          noteRu: "Премиальные лимиты согласуются отдельно для зарплатных клиентов.",
          noteTj: "Лимитҳои премиум барои муштариёни маошӣ алоҳида тасдиқ мешаванд.",
          noteUz: "Premium limitlar maosh mijozlari uchun alohida tasdiqlanadi."
        }
      ]
    },
    {
      id: 4,
      slug: "eskhata-bank",
      shortName: "ESK",
      logo: "E",
      nameRu: "Эсхата Банк",
      nameTj: "Бонки Эсхата",
      nameUz: "Eskhata Bank",
      sourceLabel: {
        ru: "Цифровой канал",
        tj: "Канали рақамӣ",
        uz: "Raqamli kanal"
      },
      updatedMinutesAgo: 6,
      rates: {
        usdBuy: 10.9,
        usdSell: 10.93,
        rubBuy: 0.1172,
        rubSell: 0.1181,
        eurBuy: 11.8,
        eurSell: 11.9
      },
      limits: [
        {
          id: 401,
          cardName: "Visa Infinite",
          cardType: "Visa",
          dailyLimit: "25 000 TJS",
          monthlyLimit: "450 000 TJS",
          commission: "0.7%",
          ownAtmNote: "0%",
          otherAtmNote: "0.7%, min 20 TJS",
          abroadNote: "1.8%, plus ATM fee",
          updatedMinutesAgo: 22,
          noteRu: "По премиальным картам доступен персональный менеджер.",
          noteTj: "Барои кортҳои премиум менеҷери шахсӣ дастрас аст.",
          noteUz: "Premium kartalar uchun shaxsiy menejer mavjud."
        },
        {
          id: 402,
          cardName: "Mastercard Standard",
          cardType: "Mastercard",
          dailyLimit: "11 000 TJS",
          monthlyLimit: "160 000 TJS",
          commission: "0%",
          ownAtmNote: "0%",
          otherAtmNote: "1.4%, min 15 TJS",
          abroadNote: "2.3%, bank + ATM fee",
          updatedMinutesAgo: 31,
          noteRu: "Комиссия может отличаться для виртуальных карт.",
          noteTj: "Комиссия барои кортҳои виртуалӣ метавонад фарқ кунад.",
          noteUz: "Virtual kartalar uchun komissiya farq qilishi mumkin."
        }
      ]
    },
    {
      id: 5,
      slug: "spitamen-bank",
      shortName: "SPB",
      logo: "S",
      nameRu: "Спитамен Банк",
      nameTj: "Бонки Спитамен",
      nameUz: "Spitamen Bank",
      sourceLabel: {
        ru: "Курс отделения и приложения",
        tj: "Қурби шуъба ва барнома",
        uz: "Filial va ilova kursi"
      },
      updatedMinutesAgo: 4,
      rates: {
        usdBuy: 10.88,
        usdSell: 10.91,
        rubBuy: 0.1168,
        rubSell: 0.1178,
        eurBuy: 11.77,
        eurSell: 11.87
      },
      limits: [
        {
          id: 501,
          cardName: "Visa Signature",
          cardType: "Visa",
          dailyLimit: "22 000 TJS",
          monthlyLimit: "360 000 TJS",
          commission: "0.5%",
          ownAtmNote: "0%",
          otherAtmNote: "0.5%, min 15 TJS",
          abroadNote: "1.9%, plus ATM fee",
          updatedMinutesAgo: 15,
          noteRu: "Для Signature часто доступны специальные предложения.",
          noteTj: "Барои Signature аксаран пешниҳодҳои махсус дастрасанд.",
          noteUz: "Signature uchun ko'pincha maxsus takliflar bo'ladi."
        },
        {
          id: 502,
          cardName: "Humo Standard",
          cardType: "Humo",
          dailyLimit: "7 500 TJS",
          monthlyLimit: "95 000 TJS",
          commission: "0%",
          ownAtmNote: "0%",
          otherAtmNote: "1.3%, min 10 TJS",
          abroadNote: "Not supported",
          updatedMinutesAgo: 25,
          noteRu: "Уточняйте доступность снятия по Humo в сторонних банкоматах.",
          noteTj: "Дастрасии гирифтани маблағро бо Humo дар банкоматҳои дигар санҷед.",
          noteUz: "Humo uchun boshqa bankomatlardagi yechib olish shartlarini aniqlang."
        }
      ]
    },
    {
      id: 6,
      slug: "dushanbe-city-bank",
      shortName: "DCB",
      logo: "DC",
      nameRu: "Душанбе Сити Банк",
      nameTj: "Бонки Душанбе Сити",
      nameUz: "Dushanbe City Bank",
      sourceLabel: {
        ru: "Городская касса",
        tj: "Хазинаи шаҳрӣ",
        uz: "Shahar kassasi"
      },
      updatedMinutesAgo: 12,
      rates: {
        usdBuy: 10.87,
        usdSell: 10.9,
        rubBuy: 0.1166,
        rubSell: 0.1177,
        eurBuy: 11.76,
        eurSell: 11.85
      },
      limits: [
        {
          id: 601,
          cardName: "Visa Business",
          cardType: "Visa",
          dailyLimit: "17 000 TJS",
          monthlyLimit: "260 000 TJS",
          commission: "1.2%",
          ownAtmNote: "0%",
          otherAtmNote: "1.2%, min 20 TJS",
          abroadNote: "2.4%, plus ATM fee",
          updatedMinutesAgo: 36,
          noteRu: "Для бизнес-карт лимиты зависят от типа счета.",
          noteTj: "Барои кортҳои бизнес лимит аз намуди ҳисоб вобаста аст.",
          noteUz: "Biznes kartalar limiti hisob turiga bog'liq."
        },
        {
          id: 602,
          cardName: "Mastercard World Elite",
          cardType: "Mastercard",
          dailyLimit: "28 000 TJS",
          monthlyLimit: "500 000 TJS",
          commission: "0.6%",
          ownAtmNote: "0%",
          otherAtmNote: "0.6%, min 25 TJS",
          abroadNote: "1.7%, plus ATM fee",
          updatedMinutesAgo: 48,
          noteRu: "Премиальные тарифы уточняются в персональном обслуживании.",
          noteTj: "Тарифҳои премиум дар хизматрасонии шахсӣ мушаххас мешаванд.",
          noteUz: "Premium tariflar shaxsiy xizmatda aniqlashtiriladi."
        }
      ]
    }
  ];

  const state = {
    language: loadValue(STORAGE_KEYS.language, "ru"),
    page: loadValue(STORAGE_KEYS.page, "home"),
    favorites: loadValue(STORAGE_KEYS.favorites, []),
    ratesView: loadValue(STORAGE_KEYS.ratesView, "cards"),
    ratesSearch: "",
    ratesSort: "name",
    ratesFavoritesOnly: false,
    visibleCurrencies: ["USD", "RUB", "EUR"],
    limitsSearch: "",
    limitsBank: "all",
    limitsCardType: "all",
    limitsFee: "all",
    converter: Object.assign(
      {
        bankId: String(banks[0].id),
        from: "USD",
        to: "TJS",
        amount: "100",
        mode: "buy"
      },
      loadValue(STORAGE_KEYS.converter, {})
    )
  };

  const app = document.getElementById("app");

  function loadValue(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveValue(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function persistConverter() {
    saveValue(STORAGE_KEYS.converter, state.converter);
  }

  function t(path) {
    return path.split(".").reduce((current, key) => current && current[key], translations[state.language]) || path;
  }

  function getLocaleCode() {
    return localeMap[state.language] || "ru-RU";
  }

  function getBankName(bank) {
    const map = {
      ru: bank.nameRu,
      tj: bank.nameTj,
      uz: bank.nameUz
    };
    return map[state.language] || bank.nameRu;
  }

  function getSourceLabel(bank) {
    return bank.sourceLabel[state.language] || bank.sourceLabel.ru;
  }

  function formatNumber(value, digits) {
    return new Intl.NumberFormat(getLocaleCode(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatRate(value) {
    return formatNumber(value, value < 1 ? 4 : 2);
  }

  function formatAmount(value, digits) {
    return new Intl.NumberFormat(getLocaleCode(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatDateTime(timestamp) {
    return new Intl.DateTimeFormat(getLocaleCode(), {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(timestamp));
  }

  function formatRelative(timestamp) {
    const diffMinutes = Math.round((new Date(timestamp).getTime() - Date.now()) / 60000);
    if (Math.abs(diffMinutes) < 1) {
      return t("common.justNow");
    }
    const formatter = new Intl.RelativeTimeFormat(getLocaleCode(), { numeric: "auto" });
    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, "minute");
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, "hour");
    }
    return formatter.format(Math.round(diffHours / 24), "day");
  }

  function getBankTimestamp(bank) {
    return new Date(Date.now() - bank.updatedMinutesAgo * 60000).toISOString();
  }

  function getLimitTimestamp(limit) {
    return new Date(Date.now() - limit.updatedMinutesAgo * 60000).toISOString();
  }

  function getRates() {
    return banks.map((bank) => ({
      bankId: bank.id,
      bank,
      updatedAt: getBankTimestamp(bank),
      sourceLabel: getSourceLabel(bank),
      usdBuy: bank.rates.usdBuy,
      usdSell: bank.rates.usdSell,
      rubBuy: bank.rates.rubBuy,
      rubSell: bank.rates.rubSell,
      eurBuy: bank.rates.eurBuy,
      eurSell: bank.rates.eurSell
    }));
  }

  function getLimits() {
    return banks.flatMap((bank) =>
      bank.limits.map((limit) => ({
        ...limit,
        bank,
        bankId: bank.id,
        updatedAt: getLimitTimestamp(limit)
      }))
    );
  }

  function isFavorite(bankId) {
    return state.favorites.includes(Number(bankId));
  }

  function toggleFavorite(bankId) {
    const numericBankId = Number(bankId);
    if (isFavorite(numericBankId)) {
      state.favorites = state.favorites.filter((id) => id !== numericBankId);
    } else {
      state.favorites = [...state.favorites, numericBankId];
    }
    saveValue(STORAGE_KEYS.favorites, state.favorites);
    render();
  }

  function getBestRates(rates) {
    const best = {
      usdBuy: rates.reduce((acc, item) => (!acc || item.usdBuy > acc.usdBuy ? item : acc), null),
      usdSell: rates.reduce((acc, item) => (!acc || item.usdSell < acc.usdSell ? item : acc), null),
      rubBuy: rates.reduce((acc, item) => (!acc || item.rubBuy > acc.rubBuy ? item : acc), null),
      rubSell: rates.reduce((acc, item) => (!acc || item.rubSell < acc.rubSell ? item : acc), null),
      eurBuy: rates.reduce((acc, item) => (!acc || item.eurBuy > acc.eurBuy ? item : acc), null),
      eurSell: rates.reduce((acc, item) => (!acc || item.eurSell < acc.eurSell ? item : acc), null)
    };

    const wins = {};
    Object.values(best).forEach((item) => {
      wins[item.bankId] = (wins[item.bankId] || 0) + 1;
    });

    const winnerId = Object.entries(wins).sort((left, right) => right[1] - left[1])[0][0];
    const highlightRate = rates.find((item) => String(item.bankId) === String(winnerId));

    return {
      best,
      highlight: {
        bank: highlightRate.bank,
        wins: wins[winnerId],
        updatedAt: highlightRate.updatedAt
      }
    };
  }

  function bankMatches(bank, searchTerm) {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [bank.nameRu, bank.nameTj, bank.nameUz, bank.shortName, bank.slug]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  function getFilteredRates() {
    return getRates()
      .filter((item) => bankMatches(item.bank, state.ratesSearch))
      .filter((item) => (state.ratesFavoritesOnly ? isFavorite(item.bankId) : true))
      .sort((left, right) => {
        const favoriteWeight = Number(isFavorite(right.bankId)) - Number(isFavorite(left.bankId));
        if (favoriteWeight !== 0) {
          return favoriteWeight;
        }
        if (state.ratesSort === "name") {
          return getBankName(left.bank).localeCompare(getBankName(right.bank), getLocaleCode());
        }
        if (state.ratesSort.endsWith("Sell")) {
          return left[state.ratesSort] - right[state.ratesSort];
        }
        return right[state.ratesSort] - left[state.ratesSort];
      });
  }

  function getFilteredLimits() {
    return getLimits().filter((item) => {
      const query = state.limitsSearch.trim().toLowerCase();
      const matchesSearch =
        bankMatches(item.bank, query) || item.cardName.toLowerCase().includes(query);
      const matchesBank = state.limitsBank === "all" || String(item.bankId) === state.limitsBank;
      const matchesCardType = state.limitsCardType === "all" || item.cardType === state.limitsCardType;
      const matchesFee =
        state.limitsFee === "all" ||
        (state.limitsFee === "no-fee" ? item.commission === "0%" : item.commission !== "0%");
      return matchesSearch && matchesBank && matchesCardType && matchesFee;
    });
  }

  function getLocalizedNote(limit) {
    const map = {
      ru: limit.noteRu,
      tj: limit.noteTj,
      uz: limit.noteUz
    };
    return map[state.language] || limit.noteRu;
  }

  function convertCurrency() {
    const bank = banks.find((item) => String(item.id) === state.converter.bankId) || banks[0];
    const amount = Number(state.converter.amount) || 0;
    const from = state.converter.from;
    const to = state.converter.to;
    const mode = state.converter.mode;

    const rateFieldMap = {
      USD: { buy: "usdBuy", sell: "usdSell" },
      RUB: { buy: "rubBuy", sell: "rubSell" },
      EUR: { buy: "eurBuy", sell: "eurSell" }
    };

    function getRateValue(currency) {
      if (currency === "TJS") {
        return 1;
      }
      return bank.rates[rateFieldMap[currency][mode]];
    }

    if (from === to) {
      return { bank, result: amount, appliedRate: 1, timestamp: getBankTimestamp(bank) };
    }

    if (from === "TJS") {
      const appliedRate = getRateValue(to);
      return { bank, result: amount / appliedRate, appliedRate, timestamp: getBankTimestamp(bank) };
    }

    if (to === "TJS") {
      const appliedRate = getRateValue(from);
      return { bank, result: amount * appliedRate, appliedRate, timestamp: getBankTimestamp(bank) };
    }

    const sourceRate = getRateValue(from);
    const targetRate = getRateValue(to);
    return {
      bank,
      result: (amount * sourceRate) / targetRate,
      appliedRate: sourceRate / targetRate,
      timestamp: getBankTimestamp(bank)
    };
  }

  function getLastUpdatedAt() {
    return getRates()
      .map((item) => new Date(item.updatedAt).getTime())
      .sort((left, right) => right - left)[0];
  }

  function getSortOptions() {
    return [
      { value: "name", label: t("rates.sortOptions.name") },
      { value: "usdBuy", label: t("rates.sortOptions.usdBuy") },
      { value: "usdSell", label: t("rates.sortOptions.usdSell") },
      { value: "rubBuy", label: t("rates.sortOptions.rubBuy") },
      { value: "rubSell", label: t("rates.sortOptions.rubSell") },
      { value: "eurBuy", label: t("rates.sortOptions.eurBuy") },
      { value: "eurSell", label: t("rates.sortOptions.eurSell") }
    ];
  }

  function renderOptions(options, selectedValue) {
    return options
      .map(
        (option) =>
          `<option value="${option.value}" ${String(option.value) === String(selectedValue) ? "selected" : ""}>${option.label}</option>`
      )
      .join("");
  }

  function renderNavButton(page, label) {
    return `<button class="nav-link ${state.page === page ? "active" : ""}" data-page="${page}" type="button">${label}</button>`;
  }

  function renderLanguageButton(code) {
    return `<button class="lang-btn ${state.language === code ? "active" : ""}" data-lang="${code}" type="button">${code.toUpperCase()}</button>`;
  }

  function renderPill(label, tone) {
    return `<span class="pill ${tone || ""}">${label}</span>`;
  }

  function renderEmptyState(title, description, actionHtml) {
    return `
      <div class="empty-card glass">
        <div class="empty-visual"><span></span><span></span><span></span></div>
        <h4>${title}</h4>
        <p>${description}</p>
        ${actionHtml || ""}
      </div>
    `;
  }

  function renderHomePage() {
    const rates = getRates();
    const { best, highlight } = getBestRates(rates);
    const summaryItems = [
      { key: "usdBuy", rate: best.usdBuy, field: "usdBuy" },
      { key: "usdSell", rate: best.usdSell, field: "usdSell" },
      { key: "rubBuy", rate: best.rubBuy, field: "rubBuy" },
      { key: "rubSell", rate: best.rubSell, field: "rubSell" },
      { key: "eurBuy", rate: best.eurBuy, field: "eurBuy" },
      { key: "eurSell", rate: best.eurSell, field: "eurSell" }
    ];
    const lastUpdated = new Date(getLastUpdatedAt()).toISOString();

    return `
      <section class="hero glass">
        <div>
          <p class="eyebrow">${t("home.eyebrow")}</p>
          <h2>${t("home.title")}</h2>
          <p>${t("home.subtitle")}</p>
          <div class="hero-actions">
            <button class="cta primary" type="button" data-page="rates">${t("common.openRates")}</button>
            <button class="cta secondary" type="button" data-page="converter">${t("common.openConverter")}</button>
          </div>
        </div>
        <div class="metrics-grid">
          <div class="metric glass">
            <span>${t("home.statBanks")}</span>
            <strong>${banks.length}</strong>
          </div>
          <div class="metric glass">
            <span>${t("home.statFavorites")}</span>
            <strong>${state.favorites.length}</strong>
          </div>
          <div class="metric glass">
            <span>${t("home.statMode")}</span>
            <strong>${t("mode.offline")}</strong>
          </div>
        </div>
      </section>

      <section class="section-head">
        <div>
          <p class="eyebrow">${t("home.marketTitle")}</p>
          <h3>${t("home.highlightTitle")}</h3>
          <p class="panel-subtitle">${t("home.marketSubtitle")}</p>
        </div>
      </section>

      <section class="banner glass">
        <div>
          <p class="eyebrow">${t("banner.title")}</p>
          <h4>${getBankName(highlight.bank)}</h4>
          <p class="panel-subtitle">${t("banner.wins")}: ${highlight.wins}</p>
          <p class="meta">${t("common.lastUpdated")}: ${formatRelative(highlight.updatedAt)}</p>
        </div>
        <button class="cta primary" type="button" data-page="rates">${t("banner.route")}</button>
      </section>

      <section class="summary-grid">
        ${summaryItems
          .map(
            (item) => `
              <article class="summary-card glass">
                <p>${t(`summary.${item.key}`)}</p>
                <strong>${formatRate(item.rate[item.field])}</strong>
                <span class="meta">${getBankName(item.rate.bank)}</span>
              </article>
            `
          )
          .join("")}
      </section>

      <section class="panel glass">
        <div class="section-head">
          <div>
            <p class="eyebrow">${t("common.quickAccess")}</p>
            <h3>${t("home.quickTitle")}</h3>
            <p class="panel-subtitle">${t("home.quickSubtitle")}</p>
          </div>
        </div>
        <div class="action-grid">
          ${[
            { page: "rates", code: "FX", label: t("home.actionRates") },
            { page: "converter", code: "CV", label: t("home.actionConverter") },
            { page: "limits", code: "ATM", label: t("home.actionLimits") },
            { page: "favorites", code: "FAV", label: t("home.actionFavorites") }
          ]
            .map(
              (item) => `
                <button class="action-card glass" type="button" data-page="${item.page}">
                  <span class="action-icon">${item.code}</span>
                  <div>
                    <strong>${item.label}</strong>
                    <p>${t("common.worksOffline")}</p>
                  </div>
                </button>
              `
            )
            .join("")}
        </div>
        <p class="meta">${t("common.lastUpdated")}: ${formatDateTime(lastUpdated)}</p>
      </section>
    `;
  }

  function renderBestFlags(bankId, best) {
    const flags = [];
    if (best.usdBuy.bankId === bankId || best.rubBuy.bankId === bankId || best.eurBuy.bankId === bankId) {
      flags.push(renderPill(t("common.buy"), "success"));
    }
    if (best.usdSell.bankId === bankId || best.rubSell.bankId === bankId || best.eurSell.bankId === bankId) {
      flags.push(renderPill(t("common.sell"), "warning"));
    }
    return flags.join("");
  }

  function renderRateCard(rate, best) {
    const boxes = state.visibleCurrencies
      .map((currency) => {
        const lower = currency.toLowerCase();
        return `
          <div class="rate-box">
            <div class="rate-box-head">
              <strong>${currency}</strong>
              <span class="meta">${t(`currencies.${currency}`)}</span>
            </div>
            <div class="rate-row">
              <span>${t("common.buy")}</span>
              <strong>${formatRate(rate[`${lower}Buy`])}</strong>
            </div>
            <div class="rate-row">
              <span>${t("common.sell")}</span>
              <strong>${formatRate(rate[`${lower}Sell`])}</strong>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <article class="rate-card glass">
        <div class="rate-card-head">
          <div class="bank-unit">
            <div class="bank-avatar">${rate.bank.logo}</div>
            <div>
              <h4>${getBankName(rate.bank)}</h4>
              <p class="bank-meta">${formatRelative(rate.updatedAt)}</p>
            </div>
          </div>
          <div class="inline-actions">
            <div class="flag-row">${renderBestFlags(rate.bankId, best)}</div>
            <button class="favorite-btn ${isFavorite(rate.bankId) ? "active" : ""}" type="button" data-favorite="${rate.bankId}" title="${t("nav.favorites")}" aria-label="${t("nav.favorites")}">FAV</button>
          </div>
        </div>
        <div class="rate-grid">${boxes}</div>
        <div class="card-foot">
          <span>${t("common.source")}: ${rate.sourceLabel}</span>
          <span>${rate.bank.shortName}</span>
        </div>
      </article>
    `;
  }

  function renderRatesTable(rates) {
    return `
      <section class="table-wrap glass">
        <table>
          <thead>
            <tr>
              <th>${t("rates.table.bank")}</th>
              ${state.visibleCurrencies.includes("USD") ? `<th>${t("rates.table.usdBuy")}</th><th>${t("rates.table.usdSell")}</th>` : ""}
              ${state.visibleCurrencies.includes("RUB") ? `<th>${t("rates.table.rubBuy")}</th><th>${t("rates.table.rubSell")}</th>` : ""}
              ${state.visibleCurrencies.includes("EUR") ? `<th>${t("rates.table.eurBuy")}</th><th>${t("rates.table.eurSell")}</th>` : ""}
              <th>${t("rates.table.updated")}</th>
            </tr>
          </thead>
          <tbody>
            ${rates
              .map(
                (rate) => `
                  <tr>
                    <td>
                      <div class="fav-inline">
                        <button class="favorite-btn ${isFavorite(rate.bankId) ? "active" : ""}" type="button" data-favorite="${rate.bankId}" title="${t("nav.favorites")}" aria-label="${t("nav.favorites")}">FAV</button>
                        <span>${getBankName(rate.bank)}</span>
                      </div>
                    </td>
                    ${state.visibleCurrencies.includes("USD") ? `<td>${formatRate(rate.usdBuy)}</td><td>${formatRate(rate.usdSell)}</td>` : ""}
                    ${state.visibleCurrencies.includes("RUB") ? `<td>${formatRate(rate.rubBuy)}</td><td>${formatRate(rate.rubSell)}</td>` : ""}
                    ${state.visibleCurrencies.includes("EUR") ? `<td>${formatRate(rate.eurBuy)}</td><td>${formatRate(rate.eurSell)}</td>` : ""}
                    <td>${formatRelative(rate.updatedAt)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  function renderRatesPage() {
    const rates = getFilteredRates();
    const best = getBestRates(getRates()).best;

    return `
      <section class="section-head">
        <div>
          <h3>${t("rates.title")}</h3>
          <p class="panel-subtitle">${t("rates.subtitle")}</p>
        </div>
        <div class="view-switch glass">
          <button class="view-btn ${state.ratesView === "cards" ? "active" : ""}" type="button" data-rates-view="cards">${t("common.cardMode")}</button>
          <button class="view-btn ${state.ratesView === "table" ? "active" : ""}" type="button" data-rates-view="table">${t("common.tableMode")}</button>
        </div>
      </section>

      <section class="toolbar-grid">
        <label class="search-field glass">
          <span>Q</span>
          <input type="search" value="${state.ratesSearch}" data-input="rates-search" placeholder="${t("rates.searchPlaceholder")}" />
        </label>
        <label class="select-field glass">
          <span>${t("common.sortBy")}</span>
          <select data-change="rates-sort">${renderOptions(getSortOptions(), state.ratesSort)}</select>
        </label>
      </section>

      <section class="panel glass">
        <p class="panel-subtitle">${t("rates.favoriteHint")}</p>
        <div class="chip-row">
          <button class="chip ${state.ratesFavoritesOnly ? "active" : ""}" type="button" data-action="toggle-rates-favorites">${t("nav.favorites")}</button>
          ${["USD", "RUB", "EUR"]
            .map(
              (currency) => `
                <button class="chip ${state.visibleCurrencies.includes(currency) ? "active" : ""}" type="button" data-currency="${currency}">
                  ${currency}
                </button>
              `
            )
            .join("")}
          <button class="chip" type="button" data-action="clear-rates">${t("common.clearFilters")}</button>
        </div>
      </section>

      ${
        rates.length
          ? state.ratesView === "cards"
            ? `<section class="rates-grid">${rates.map((rate) => renderRateCard(rate, best)).join("")}</section>`
            : renderRatesTable(rates)
          : renderEmptyState(
              t("rates.noResultsTitle"),
              t("rates.noResultsDescription"),
              `<button class="cta secondary" type="button" data-action="clear-rates">${t("common.clearFilters")}</button>`
            )
      }
    `;
  }

  function renderConverterPage() {
    const result = convertCurrency();
    const selectedBank = result.bank;
    return `
      <section class="section-head">
        <div>
          <h3>${t("converter.title")}</h3>
          <p class="panel-subtitle">${t("converter.subtitle")}</p>
        </div>
      </section>

      <section class="converter-card glass">
        <div class="converter-form">
          <label class="field">
            <span>${t("common.selectedBank")}</span>
            <select data-change="converter-bank">
              ${renderOptions(
                banks.map((bank) => ({ value: String(bank.id), label: getBankName(bank) })),
                state.converter.bankId
              )}
            </select>
          </label>

          <div class="dual-grid">
            <label class="field">
              <span>${t("common.from")}</span>
              <select data-change="converter-from">
                ${renderOptions(["TJS", "USD", "RUB", "EUR"].map((code) => ({ value: code, label: code })), state.converter.from)}
              </select>
            </label>
            <button class="icon-btn" type="button" data-action="swap-converter" title="${t("converter.swap")}" aria-label="${t("converter.swap")}">SWAP</button>
            <label class="field">
              <span>${t("common.to")}</span>
              <select data-change="converter-to">
                ${renderOptions(["TJS", "USD", "RUB", "EUR"].map((code) => ({ value: code, label: code })), state.converter.to)}
              </select>
            </label>
          </div>

          <label class="field">
            <span>${t("common.amount")}</span>
            <input type="number" min="0" step="0.01" value="${state.converter.amount}" data-input="converter-amount" />
          </label>

          <div>
            <p class="panel-subtitle">${t("converter.quickAmounts")}</p>
            <div class="quick-amounts">
              ${[100, 500, 1000, 5000]
                .map((value) => `<button class="chip" type="button" data-quick-amount="${value}">${value}</button>`)
                .join("")}
            </div>
          </div>

          <div>
            <p class="panel-subtitle">${t("converter.modeLabel")}</p>
            <div class="mode-switch">
              <button class="mode-btn ${state.converter.mode === "buy" ? "active" : ""}" type="button" data-mode="buy">${t("common.buy")}</button>
              <button class="mode-btn ${state.converter.mode === "sell" ? "active" : ""}" type="button" data-mode="sell">${t("common.sell")}</button>
            </div>
          </div>
        </div>

        <div class="converter-result">
          <p class="eyebrow">${t("common.result")}</p>
          <h4>${getBankName(selectedBank)}</h4>
          <strong>${formatAmount(result.result, state.converter.to === "TJS" ? 2 : 4)} ${state.converter.to}</strong>
          <p>${t("common.rateUsed")}: ${formatRate(result.appliedRate)}</p>
          <p>${t("common.lastUpdated")}: ${formatDateTime(result.timestamp)}</p>
          <div class="pill-row">
            ${renderPill(t("common.localPreview"), "success")}
            ${renderPill(selectedBank.shortName, "")}
          </div>
        </div>
      </section>

      <section class="notice glass">
        <h4>${t("common.worksOffline")}</h4>
        <p>${t("converter.info")}</p>
      </section>
    `;
  }

  function renderLimitCard(limit) {
    return `
      <article class="limit-card glass">
        <div class="limit-card-head">
          <div>
            <p class="eyebrow">${limit.cardType}</p>
            <h4>${limit.cardName}</h4>
            <p class="bank-meta">${getBankName(limit.bank)}</p>
          </div>
          ${renderPill(limit.commission, limit.commission === "0%" ? "success" : "warning")}
        </div>

        <div class="limit-stats">
          <div class="limit-stat">
            <span>${t("common.dailyLimit")}</span>
            <strong>${limit.dailyLimit}</strong>
          </div>
          <div class="limit-stat">
            <span>${t("common.monthlyLimit")}</span>
            <strong>${limit.monthlyLimit}</strong>
          </div>
          <div class="limit-stat">
            <span>${t("common.commission")}</span>
            <strong>${limit.commission}</strong>
          </div>
        </div>

        <div class="limit-notes">
          <div class="limit-note">
            <span class="limit-note-title">${t("common.ownAtms")}</span>
            <p>${limit.ownAtmNote}</p>
          </div>
          <div class="limit-note">
            <span class="limit-note-title">${t("common.otherAtms")}</span>
            <p>${limit.otherAtmNote}</p>
          </div>
          <div class="limit-note">
            <span class="limit-note-title">${t("common.abroad")}</span>
            <p>${limit.abroadNote}</p>
          </div>
        </div>

        <div class="limit-foot">
          <p>${getLocalizedNote(limit)}</p>
          <p class="meta">${t("common.lastUpdated")}: ${formatRelative(limit.updatedAt)}</p>
        </div>
      </article>
    `;
  }

  function renderLimitsPage() {
    const limits = getFilteredLimits();
    const cardTypes = [...new Set(getLimits().map((item) => item.cardType))];
    const bankOptions = [{ value: "all", label: t("common.allBanks") }].concat(
      banks.map((bank) => ({ value: String(bank.id), label: getBankName(bank) }))
    );
    const cardTypeOptions = [{ value: "all", label: t("common.allCardTypes") }].concat(
      cardTypes.map((type) => ({ value: type, label: type }))
    );

    return `
      <section class="section-head">
        <div>
          <h3>${t("limits.title")}</h3>
          <p class="panel-subtitle">${t("limits.subtitle")}</p>
        </div>
      </section>

      <section class="limits-top">
        <div class="notice glass">
          <h4>${t("limits.disclaimerTitle")}</h4>
          <p>${t("limits.disclaimerBody")}</p>
        </div>

        <div class="toolbar-grid triple">
          <label class="search-field glass">
            <span>Q</span>
            <input type="search" value="${state.limitsSearch}" data-input="limits-search" placeholder="${t("common.searchBank")}" />
          </label>
          <label class="select-field glass">
            <span>${t("common.selectedBank")}</span>
            <select data-change="limits-bank">${renderOptions(bankOptions, state.limitsBank)}</select>
          </label>
          <label class="select-field glass">
            <span>${t("common.cardType")}</span>
            <select data-change="limits-card-type">${renderOptions(cardTypeOptions, state.limitsCardType)}</select>
          </label>
        </div>

        <div class="chip-row">
          <button class="chip ${state.limitsFee === "all" ? "active" : ""}" type="button" data-fee="all">${t("common.allFees")}</button>
          <button class="chip ${state.limitsFee === "no-fee" ? "active" : ""}" type="button" data-fee="no-fee">${t("common.noCommission")}</button>
          <button class="chip ${state.limitsFee === "fee" ? "active" : ""}" type="button" data-fee="fee">${t("common.withCommission")}</button>
        </div>
      </section>

      ${
        limits.length
          ? `<section class="limits-grid">${limits.map(renderLimitCard).join("")}</section>`
          : renderEmptyState(
              t("limits.noResultsTitle"),
              t("limits.noResultsDescription"),
              `<button class="cta secondary" type="button" data-action="clear-limits">${t("common.clearFilters")}</button>`
            )
      }
    `;
  }

  function renderFavoritesPage() {
    const favoriteRates = getRates().filter((item) => isFavorite(item.bankId));
    const best = getBestRates(getRates()).best;
    return `
      <section class="section-head">
        <div>
          <h3>${t("favorites.title")}</h3>
          <p class="panel-subtitle">${t("favorites.subtitle")}</p>
        </div>
      </section>
      ${
        favoriteRates.length
          ? `<section class="favorites-grid">${favoriteRates.map((rate) => renderRateCard(rate, best)).join("")}</section>`
          : renderEmptyState(
              t("favorites.emptyTitle"),
              t("favorites.emptyDescription"),
              `<button class="cta primary" type="button" data-page="rates">${t("common.openRates")}</button>`
            )
      }
    `;
  }

  function renderPage() {
    switch (state.page) {
      case "rates":
        return renderRatesPage();
      case "converter":
        return renderConverterPage();
      case "limits":
        return renderLimitsPage();
      case "favorites":
        return renderFavoritesPage();
      default:
        return renderHomePage();
    }
  }

  function render() {
    document.documentElement.lang = state.language;
    document.title = `${t("brand.title")} - ${t(`nav.${state.page}`)}`;

    app.innerHTML = `
      <div class="app-shell">
        <div class="ambient-orb orb-a"></div>
        <div class="ambient-orb orb-b"></div>
        <div class="ambient-orb orb-c"></div>

        <header class="topbar glass">
          <div class="brand">
            <div class="brand-mark">B</div>
            <div>
              <h1>${t("brand.title")}</h1>
              <p>${t("brand.subtitle")}</p>
            </div>
          </div>

          <nav class="desktop-nav">
            ${renderNavButton("home", t("nav.home"))}
            ${renderNavButton("rates", t("nav.rates"))}
            ${renderNavButton("converter", t("nav.converter"))}
            ${renderNavButton("limits", t("nav.limits"))}
            ${renderNavButton("favorites", t("nav.favorites"))}
          </nav>

          <div class="lang-switch glass">
            ${renderLanguageButton("ru")}
            ${renderLanguageButton("tj")}
            ${renderLanguageButton("uz")}
          </div>
        </header>

        <main class="main">
          <section class="page">
            ${renderPage()}
          </section>
        </main>

        <nav class="bottom-nav glass">
          <button class="bottom-link ${state.page === "home" ? "active" : ""}" type="button" data-page="home"><span class="icon">HM</span><span>${t("nav.home")}</span></button>
          <button class="bottom-link ${state.page === "rates" ? "active" : ""}" type="button" data-page="rates"><span class="icon">FX</span><span>${t("nav.rates")}</span></button>
          <button class="bottom-link ${state.page === "converter" ? "active" : ""}" type="button" data-page="converter"><span class="icon">CV</span><span>${t("nav.converter")}</span></button>
          <button class="bottom-link ${state.page === "limits" ? "active" : ""}" type="button" data-page="limits"><span class="icon">ATM</span><span>${t("nav.limits")}</span></button>
          <button class="bottom-link ${state.page === "favorites" ? "active" : ""}" type="button" data-page="favorites"><span class="icon">FAV</span><span>${t("nav.favorites")}</span></button>
        </nav>
      </div>
    `;
  }

  document.addEventListener("click", function (event) {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      state.page = pageButton.getAttribute("data-page");
      saveValue(STORAGE_KEYS.page, state.page);
      render();
      return;
    }

    const languageButton = event.target.closest("[data-lang]");
    if (languageButton) {
      state.language = languageButton.getAttribute("data-lang");
      saveValue(STORAGE_KEYS.language, state.language);
      render();
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.getAttribute("data-favorite"));
      return;
    }

    const ratesViewButton = event.target.closest("[data-rates-view]");
    if (ratesViewButton) {
      state.ratesView = ratesViewButton.getAttribute("data-rates-view");
      saveValue(STORAGE_KEYS.ratesView, state.ratesView);
      render();
      return;
    }

    const currencyButton = event.target.closest("[data-currency]");
    if (currencyButton) {
      const currency = currencyButton.getAttribute("data-currency");
      if (state.visibleCurrencies.includes(currency)) {
        if (state.visibleCurrencies.length > 1) {
          state.visibleCurrencies = state.visibleCurrencies.filter((item) => item !== currency);
        }
      } else {
        state.visibleCurrencies = [...state.visibleCurrencies, currency];
      }
      render();
      return;
    }

    const quickAmountButton = event.target.closest("[data-quick-amount]");
    if (quickAmountButton) {
      state.converter.amount = quickAmountButton.getAttribute("data-quick-amount");
      persistConverter();
      render();
      return;
    }

    const modeButton = event.target.closest("[data-mode]");
    if (modeButton) {
      state.converter.mode = modeButton.getAttribute("data-mode");
      persistConverter();
      render();
      return;
    }

    const feeButton = event.target.closest("[data-fee]");
    if (feeButton) {
      state.limitsFee = feeButton.getAttribute("data-fee");
      render();
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.getAttribute("data-action");
      if (action === "swap-converter") {
        const currentFrom = state.converter.from;
        state.converter.from = state.converter.to;
        state.converter.to = currentFrom;
        persistConverter();
      }
      if (action === "toggle-rates-favorites") {
        state.ratesFavoritesOnly = !state.ratesFavoritesOnly;
      }
      if (action === "clear-rates") {
        state.ratesSearch = "";
        state.ratesSort = "name";
        state.ratesFavoritesOnly = false;
        state.visibleCurrencies = ["USD", "RUB", "EUR"];
      }
      if (action === "clear-limits") {
        state.limitsSearch = "";
        state.limitsBank = "all";
        state.limitsCardType = "all";
        state.limitsFee = "all";
      }
      render();
      return;
    }
  });

  document.addEventListener("input", function (event) {
    const type = event.target.getAttribute("data-input");
    if (!type) {
      return;
    }
    if (type === "rates-search") {
      state.ratesSearch = event.target.value;
    }
    if (type === "limits-search") {
      state.limitsSearch = event.target.value;
    }
    if (type === "converter-amount") {
      state.converter.amount = event.target.value;
      persistConverter();
    }
    render();
  });

  document.addEventListener("change", function (event) {
    const type = event.target.getAttribute("data-change");
    if (!type) {
      return;
    }
    if (type === "rates-sort") {
      state.ratesSort = event.target.value;
    }
    if (type === "limits-bank") {
      state.limitsBank = event.target.value;
    }
    if (type === "limits-card-type") {
      state.limitsCardType = event.target.value;
    }
    if (type === "converter-bank") {
      state.converter.bankId = event.target.value;
      persistConverter();
    }
    if (type === "converter-from") {
      state.converter.from = event.target.value;
      persistConverter();
    }
    if (type === "converter-to") {
      state.converter.to = event.target.value;
      persistConverter();
    }
    render();
  });

  render();

})();
