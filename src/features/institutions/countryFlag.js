/**
 * ISO 3166-1 alpha-2 pour afficher un drapeau (flagcdn) à partir du nom de pays.
 * Couvre le réseau AfrEA + variantes FR/EN courantes.
 */
const COUNTRY_ISO = {
  algeria: 'dz',
  algérie: 'dz',
  algerie: 'dz',
  angola: 'ao',
  benin: 'bj',
  bénin: 'bj',
  botswana: 'bw',
  'burkina faso': 'bf',
  burundi: 'bi',
  cameroon: 'cm',
  cameroun: 'cm',
  'cabo verde': 'cv',
  'cape verde': 'cv',
  'cap-vert': 'cv',
  'central african republic': 'cf',
  'république centrafricaine': 'cf',
  'republique centrafricaine': 'cf',
  chad: 'td',
  tchad: 'td',
  comoros: 'km',
  comores: 'km',
  congo: 'cg',
  'congo-brazzaville': 'cg',
  'democratic republic of the congo': 'cd',
  'république démocratique du congo': 'cd',
  'republique democratique du congo': 'cd',
  'dr congo': 'cd',
  'rd congo': 'cd',
  'côte d’ivoire': 'ci',
  "cote d'ivoire": 'ci',
  "côte d'ivoire": 'ci',
  'ivory coast': 'ci',
  djibouti: 'dj',
  egypt: 'eg',
  égypte: 'eg',
  egypte: 'eg',
  'equatorial guinea': 'gq',
  'guinée équatoriale': 'gq',
  'guinee equatoriale': 'gq',
  eritrea: 'er',
  érythrée: 'er',
  erythree: 'er',
  eswatini: 'sz',
  swaziland: 'sz',
  ethiopia: 'et',
  éthiopie: 'et',
  ethiopie: 'et',
  gabon: 'ga',
  gambia: 'gm',
  gambie: 'gm',
  ghana: 'gh',
  guinea: 'gn',
  guinée: 'gn',
  guinee: 'gn',
  'guinea-bissau': 'gw',
  'guinée-bissau': 'gw',
  kenya: 'ke',
  lesotho: 'ls',
  liberia: 'lr',
  libéria: 'lr',
  libya: 'ly',
  libye: 'ly',
  madagascar: 'mg',
  malawi: 'mw',
  mali: 'ml',
  mauritania: 'mr',
  mauritanie: 'mr',
  mauritius: 'mu',
  maurice: 'mu',
  morocco: 'ma',
  maroc: 'ma',
  mozambique: 'mz',
  namibia: 'na',
  namibie: 'na',
  niger: 'ne',
  nigeria: 'ng',
  nigéria: 'ng',
  rwanda: 'rw',
  'sao tome and principe': 'st',
  'são tomé-et-principe': 'st',
  'sao tome-et-principe': 'st',
  senegal: 'sn',
  sénégal: 'sn',
  seychelles: 'sc',
  'sierra leone': 'sl',
  somalia: 'so',
  somalie: 'so',
  'south africa': 'za',
  'afrique du sud': 'za',
  'south sudan': 'ss',
  'soudan du sud': 'ss',
  sudan: 'sd',
  soudan: 'sd',
  tanzania: 'tz',
  tanzanie: 'tz',
  togo: 'tg',
  tunisia: 'tn',
  tunisie: 'tn',
  uganda: 'ug',
  ouganda: 'ug',
  zambia: 'zm',
  zambie: 'zm',
  zimbabwe: 'zw',
  france: 'fr',
  belgium: 'be',
  belgique: 'be',
  canada: 'ca',
  switzerland: 'ch',
  suisse: 'ch',
  'united states': 'us',
  'états-unis': 'us',
  'etats-unis': 'us',
  'united kingdom': 'gb',
  'royaume-uni': 'gb',
}

function normalizeCountryKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, "'")
}

const COUNTRY_ISO_FLAT = Object.fromEntries(
  Object.entries(COUNTRY_ISO).map(([k, v]) => [normalizeCountryKey(k), v]),
)

/** @returns {string|null} code ISO alpha-2 minuscule */
export function countryIsoCode(countryName, countryCode) {
  if (countryCode && /^[a-z]{2}$/i.test(String(countryCode).trim())) {
    return String(countryCode).trim().toLowerCase()
  }
  const key = normalizeCountryKey(countryName)
  return COUNTRY_ISO_FLAT[key] || null
}

/** URL drapeau miniature (flagcdn). */
export function countryFlagUrl(countryName, countryCode, width = 40) {
  const iso = countryIsoCode(countryName, countryCode)
  if (!iso) return null
  return `https://flagcdn.com/w${width}/${iso}.png`
}
