// The one vocabulary every source is translated into.
//
// Each bank names these differently — Imon ships codes (SPK, KK, GISE), Arvand ships
// TRANSFER_RATE, Dushanbe City ships `type=transfer`, Amonat ships `remittances` — and the site
// has to compare them side by side. Mapping happens once, at the edge, in bank-apis.js; nothing
// downstream should ever see a bank's private naming.

const RATE_TYPES = {
  // Notes at the counter, in hand.
  CASH: "cash",
  // Money transfers — the rate most people are quoted, and the one shown as the headline.
  TRANSFER: "transfer",
  // Card operations (Visa/Mastercard conversion).
  CARD: "card",
  // Account-to-account without notes changing hands.
  NONCASH: "noncash",
  // Corporate customers. Kept because banks publish it, though it is not who this site is for.
  LEGAL: "legal",
  // Repaying a loan denominated in another currency.
  LOAN: "loan",
  // The National Bank's official figure. A reference, not something a bank will trade at, so it
  // carries a single value rather than a spread.
  NBT: "nbt"
};

const ALL_TYPES = Object.values(RATE_TYPES);

// Which published rate becomes the headline on a card and in the comparison.
//
// Transfers first because that is the operation most of this audience performs, and it is what the
// banks themselves put on the first tab. Card and non-cash next, since they usually track the
// transfer rate closely. Cash last of the tradeable types: it is the widest spread and the least
// representative — Alif's counter rouble is 20% away from its transfer rate, so leading with it
// would make an ordinary bank look like a bad one.
//
// nbt is deliberately absent. It is the state's reference figure, not an offer, and no bank will
// exchange at it — presenting it as a bank's rate is the specific mistake this file exists to stop.
const HEADLINE_PREFERENCE = [
  RATE_TYPES.TRANSFER,
  RATE_TYPES.CARD,
  RATE_TYPES.NONCASH,
  RATE_TYPES.CASH,
  RATE_TYPES.LEGAL
];

// Picks the headline type for a bank from whatever it actually publishes, so a bank that offers
// only cash still gets a card rather than an empty one.
function pickHeadlineType(availableTypes) {
  const available = new Set(availableTypes);
  return HEADLINE_PREFERENCE.find((type) => available.has(type)) || null;
}

module.exports = { RATE_TYPES, ALL_TYPES, HEADLINE_PREFERENCE, pickHeadlineType };
