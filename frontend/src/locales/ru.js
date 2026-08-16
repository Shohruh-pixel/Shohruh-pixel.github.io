export default {
  locale: {
    code: "ru",
    label: "RU",
    name: "Русский"
  },
  brand: {
    title: "BankRate TJ",
    subtitle: "Курсы валют и лимиты по банкам Таджикистана"
  },
  nav: {
    home: "Главная",
    rates: "Курсы",
    converter: "Конвертер",
    limits: "Лимиты",
    favorites: "Избранное"
  },
  rateType: {
    title: "Курс по типу операции",
    cash: "В кассе",
    transfer: "Переводы",
    card: "Картой",
    noncash: "Безналичными",
    legal: "Юрлицам",
    loan: "Погашение кредита",
    nbt: "Курс НБТ"
  },
  common: {
    favoriteAdd: "Добавить в избранное",
    favoriteRemove: "Убрать из избранного",
    searchBank: "Поиск банка",
    lastUpdated: "Последнее обновление",
    updated: "Обновлено",
    sortBy: "Сортировка",
    cardMode: "Карточки",
    tableMode: "Таблица",
    buy: "Покупка",
    sell: "Продажа",
    ownAtms: "Свои банкоматы",
    otherAtms: "Другие банкоматы",
    abroad: "За рубежом",
    dailyLimit: "Дневной лимит",
    monthlyLimit: "Месячный лимит",
    commission: "Комиссия",
    favorites: "Избранное",
    selectedBank: "Банк для расчёта",
    amount: "Сумма",
    from: "Отдаю",
    to: "Получаю",
    result: "Результат",
    rateUsed: "Использованный курс",
    source: "Источник",
    noDataFound: "Данные не найдены",
    clear: "Сбросить",
    noCommission: "Без комиссии",
    withCommission: "С комиссией",
    allFees: "Все комиссии",
    justNow: "только что",
    synced: "Проверено API",
    localPreview: "Мгновенный локальный расчет",
    allBanks: "Все банки",
    cardType: "Тип карты",
    allCardTypes: "Все типы карт",
    all: "Все"
  },
  currencies: {
    TJS: "Таджикский сомони",
    USD: "Доллар США",
    RUB: "Российский рубль",
    EUR: "Евро"
  },
  summary: {
    usdBuy: "Где выгоднее продать доллары",
    usdSell: "Где дешевле купить доллары",
    rubBuy: "Где выгоднее продать рубли",
    rubSell: "Где дешевле купить рубли",
    eurBuy: "Где выгоднее продать евро",
    eurSell: "Где дешевле купить евро"
  },
  trend: {
    up: "Рост",
    down: "Ниже",
    flat: "Стабильно",
    previous: "Было {value}"
  },
  home: {
    heroEyebrow: "Ежедневный валютный пульс",
    heroTitle: "Быстро сравнивайте лучшие курсы и лимиты снятия по банкам Таджикистана.",
    heroSubtitle:
      "Футуристичный мобильный fintech-интерфейс для людей, которым нужно решение за несколько секунд.",
    heroPrimary: "Смотреть курсы",
    heroSecondary: "Открыть конвертер",
    marketTitle: "Рынок сегодня",
    marketSubtitle: "Лучшие ставки по USD, RUB и EUR собраны в одном экране.",
    highlightTitle: "Лучший банк дня",
    ratesAction: "Курсы валют",
    statBanks: "Активные банки",
    statFavorites: "В избранном",
    statUpdated: "Обновление"
  },
  rates: {
    title: "Курсы банков",
    subtitle: "Красивые карточки для быстрого сравнения и компактная таблица для плотного обзора.",
    searchPlaceholder: "Введите название банка",
    visibility: "Показывать валюты",
    favoriteHint: "Избранные банки поднимаются наверх автоматически.",
    noResultsTitle: "Ничего не найдено",
    noResultsDescription: "Попробуйте изменить поиск, валюты или сортировку.",
    sortOptions: {
      name: "По названию банка",
      usdBuy: "Лучший USD покупка",
      usdSell: "Лучший USD продажа",
      rubBuy: "Лучший RUB покупка",
      rubSell: "Лучший RUB продажа",
      eurBuy: "Лучший EUR покупка",
      eurSell: "Лучший EUR продажа"
    },
    table: {
      bank: "Банк",
      updated: "Обновлено",
      usdBuy: "USD пок.",
      usdSell: "USD прод.",
      rubBuy: "RUB пок.",
      rubSell: "RUB прод.",
      eurBuy: "EUR пок.",
      eurSell: "EUR прод."
    }
  },
  converter: {
    title: "Конвертер по курсу банка",
    subtitle: "Выберите банк, валютную пару и сразу увидите расчет по актуальному курсу.",
    quickAmounts: "Быстрые суммы",
    swap: "Поменять валюты",
    modeLabel: "Тип курса",
    rateSnapshot: "Используется текущий снимок курса выбранного банка.",
    apiSync: "Если API доступен, расчет сверяется с сервером автоматически.",
    emptyTitle: "Нужны курсы для расчета",
    emptyDescription: "Запустите backend и загрузите данные банков, чтобы конвертер заработал."
  },
  limits: {
    missingNote: "Лимиты показаны по банкам, которые их публикуют. Для остальных данных пока нет.",
    title: "Лимиты снятия",
    subtitle: "Сравните дневные и месячные ограничения по картам разных банков.",
    disclaimerTitle: "Важно",
    disclaimerBody: "Пожалуйста, уточняйте лимиты в банке. Данные могут зависеть от тарифа и типа карты.",
    noResultsTitle: "Лимиты не найдены",
    noResultsDescription: "Сбросьте фильтры или выберите другой банк."
  },
  favorites: {
    title: "Избранные банки",
    subtitle: "Ваши любимые банки хранятся локально и всегда доступны под рукой.",
    emptyTitle: "Список пока пуст",
    emptyDescription: "Добавьте банки в избранное на странице курсов, и они появятся здесь."
  },
  offline: {
    title: "Нет подключения — показаны последние сохранённые курсы",
    asOf: "данные на {time}"
  },
  notFound: {
    title: "Страница не найдена",
    description: "Возможно, ссылка устарела или в адресе опечатка."
  },
  bank: {
    title: "Курсы валют {bank}",
    subtitle: "Покупка и продажа доллара, рубля и евро в {bank} с указанием источника данных.",
    limitsTitle: "Лимиты снятия — {bank}",
    othersTitle: "Другие банки",
    othersSubtitle: "Сравните курс доллара с остальными банками Таджикистана.",
    notFoundTitle: "Банк не найден",
    notFoundDescription: "Возможно, ссылка устарела или банк больше не отслеживается."
  },
  banner: {
    title: "Лучший банк дня",
    wins: "Лидирует по категориям",
    route: "Перейти к ставкам"
  },
  empty: {
    title: "Пока пусто",
    description: "Данные появятся после загрузки."
  }
};
