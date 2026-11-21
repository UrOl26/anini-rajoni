// All user-facing text in the app, in Slovenian (NAVODILA 1.4).
// Informal address, feminine forms where grammar needs a gender.

/** Slovenian plural: 1 / 2 / 3–4 / 0 and 5+ (also 101, 102 …). */
export function plural(n, [one, two, few, many]) {
  const m = Math.abs(n) % 100;
  if (m === 1) return one;
  if (m === 2) return two;
  if (m === 3 || m === 4) return few;
  return many;
}

export const sl = {
  appName: 'Anini Rajoni',
  back: 'Nazaj',
  save: 'Shrani',
  cancel: 'Prekliči',
  delete: 'Izbriši',
  rename: 'Preimenuj',
  yes: 'Da',
  no: 'Ne',
  done: 'Končano',
  saved: 'Shranjeno',

  // 5.1 Routes and locations
  searchAddress: 'Išči naslov …',
  routes: 'Rajoni',
  route: (n) => `Rajon ${n}`,
  addRoute: 'Dodaj rajon',
  routeNumber: 'Številka rajona',
  routeExists: 'Ta rajon že obstaja.',
  routeNumberMissing: 'Vpiši številko rajona.',
  locationsCount: (n) => `${n} ${plural(n, ['lokacija', 'lokaciji', 'lokacije', 'lokacij'])}`,
  mailboxesCount: (n) =>
    `${n} ${plural(n, ['nabiralnik', 'nabiralnika', 'nabiralniki', 'nabiralnikov'])}`,
  noLayout: 'Ni razporeda',
  addLocation: 'Dodaj lokacijo',
  address: 'Naslov',
  addressPlaceholder: 'npr. Celovška cesta 12, vhod A',
  addressMissing: 'Vpiši naslov.',
  scan: 'Skeniraj',
  scanAddress: 'Skeniraj naslov',
  scanAddressHint: 'Usmeri kamero v hišno tablico ali naslov na pismu.',
  addressNotFound: 'Naslova ni bilo mogoče prebrati.',
  manageList: 'Uredi seznam',
  reorderTitle: 'Urejanje seznama',
  noRoutes: 'Še nimaš nobenega rajona.',
  noLocations: 'V tem rajonu še ni lokacij.',
  noResults: 'Ni zadetkov',
  confirmDeleteLocation:
    'Si prepričana, da želiš izbrisati? Izbrisan bo tudi razpored nabiralnikov in vsi priimki.',
  confirmDeleteRoute:
    'Si prepričana, da želiš izbrisati? Izbrisane bodo tudi vse lokacije v tem rajonu.',
  dragHandle: 'Premakni',

  // 5.2 Layout
  layout: 'Razpored nabiralnikov',
  editLayout: 'Uredi razpored',
  editLayoutTitle: 'Urejanje razporeda',
  rows: 'Vrstice',
  cols: 'Stolpci',
  addOne: 'Dodaj',
  removeOne: 'Odstrani',
  editHint: 'Tapni nabiralnik, ki ni v uporabi.',
  confirmRemoveNamed: 'Si prepričana, da želiš izbrisati? Ti nabiralniki imajo vpisane priimke.',
  notInUse: 'Nabiralnik ni v uporabi',
  confirmDisableNamed: (n) => `Res želiš onemogočiti nabiralnik ${n}? Vsebuje priimke.`,
  disableNote:
    'Priimki na onemogočenem nabiralniku ne bodo izbrisani, samo onemogočeni. Če nabiralnik ponovno omogočiš, se bodo priimki pojavili nazaj.',
  disableMailbox: 'Onemogoči nabiralnik',

  // 5.3 Scanner
  scanNames: 'Skeniraj priimke',
  scanOneName: 'Skeniraj priimek',
  scanOneHint: 'Usmeri kamero v priimek na nabiralniku.',
  enterManually: 'Vpiši ročno',
  previousMailbox: 'Prejšnji nabiralnik',
  nextMailbox: 'Naslednji nabiralnik',
  pointAt: (n) => `Usmeri kamero v priimek na nabiralniku ${n}.`,
  reading: 'Berem …',
  noName: 'Ni berljivega priimka.',
  allScanned: 'Vsi nabiralniki so skenirani.',
  maxNames: 'Največ 5 priimkov na nabiralnik.',
  cameraStarting: 'Zaganjam kamero …',
  cameraFailed: 'Kamere ni bilo mogoče odpreti. Preveri dovoljenje za kamero.',
  needInternet: 'Za skeniranje potrebuješ internet.',
  needKey: 'Za skeniranje najprej aktiviraj skener.',
  openSettings: 'Odpri nastavitve',
  errAuth: 'Skener ne deluje več. Aktiviraj ga znova.',
  errBusy: 'Strežnik je zaseden. Poskušam znova …',
  errOther: 'Branje ni uspelo. Poskušam znova …',
  familyName: 'Priimek',
  familyNamePlaceholder: 'npr. Novak',
  torchOn: 'Prižgi svetilko',
  torchOff: 'Ugasni svetilko',

  // Mailbox and family names. A mailbox is labelled like a chessboard: column number + row letter, e.g. 5C.
  mailbox: (label) => `Nabiralnik ${label}`,
  addName: 'Dodaj priimek',
  noNamesYet: 'Ta nabiralnik še nima priimka.',
  deleteName: (name) => `Izbriši ${name}`,

  // 5.4 Search
  searchName: 'Išči priimek …',
  clearSearch: 'Počisti iskanje',
  scanLetter: 'Skeniraj pismo',
  scanLetterHint: 'Usmeri kamero v priimek na pismu.',
  pickFamilyName: 'Kateri je priimek?',
  matches: (n) => `${n} ${plural(n, ['zadetek', 'zadetka', 'zadetki', 'zadetkov'])}`,
  tapMailboxToAdd: (name) => `Tapni nabiralnik, kamor spada ${name}.`,
  nameNotHere: 'Priimek na tem naslovu še ne obstaja.',

  // 5.5 Learning
  learnAddEmpty: (name, n) => `Dodam priimek ${name} v nabiralnik ${n}?`,
  learnHasOne: (n, existing) => `Nabiralnik ${n} že ima priimek: ${existing}. Kaj želiš narediti?`,
  learnHasMany: (n, existing) =>
    `Nabiralnik ${n} že ima priimke: ${existing}. Kaj želiš narediti?`,
  addToExistingOne: 'Dodaj k obstoječemu',
  addToExistingMany: 'Dodaj k obstoječim',
  replaceExistingOne: 'Zamenjaj obstoječe',
  replaceMany: 'Zamenjaj',
  replaceWhich: (name) => `Kaj zamenjam s priimkom ${name}?`,
  allNames: 'Vse priimke',

  // Scanner activation (QR code with the API key)
  activateScanner: 'Aktiviraj skener',
  activateBannerHint: 'Za branje priimkov s kamero. Pokliči Uršo.',
  reactivateBannerHint: 'Skener ne deluje več. Tapni in poskeniraj novo kodo. Pokliči Uršo.',
  activateHint: 'Usmeri kamero v kodo za aktivacijo.',
  notActivationCode: 'To ni koda za aktivacijo skenerja.',
  checkingCode: 'Preverjam kodo …',
  activated: 'Skener je aktiviran.',
  activatedFor: (name) => `Skener je aktiviran – ${name}.`,
  activatedUnchecked: 'Skener je aktiviran. Delovanje se preveri ob prvem skeniranju.',
  codeNotValid: 'Ta koda ni več veljavna. Prosi za novo.',
  scanActivationCode: 'Skeniraj kodo za aktivacijo',
  orEnterKey: 'Ali vpiši ključ ročno:',

  // Settings and backups
  settings: 'Nastavitve',
  apiKey: 'API ključ',
  apiKeyHint: 'Potreben je za skeniranje. Shrani se samo na tem telefonu.',
  apiKeySavedFor: (name) => `Ključ je shranjen (${name}).`,
  apiKeyBad: 'Ključ ni več veljaven. Aktiviraj skener znova.',
  apiKeySaved: 'Ključ je shranjen.',
  apiKeyPlaceholder: 'sk-ant-…',
  deleteKey: 'Izbriši ključ',
  backup: 'Varnostna kopija',
  backupHint: 'Shrani kopijo vseh rajonov, razporedov in priimkov, npr. v Datoteke ali iCloud Drive.',
  exportData: 'Izvozi',
  importData: 'Uvozi',
  lastBackup: (date) => `Zadnja varnostna kopija: ${date}`,
  lastBackupDaysAgo: (d) =>
    d === 0
      ? 'Zadnja varnostna kopija: danes'
      : `Zadnja varnostna kopija: pred ${d} ${plural(d, ['dnevom', 'dnevoma', 'dnevi', 'dnevi'])}`,
  noBackupYet: 'Varnostne kopije še nisi naredila.',
  exported: 'Varnostna kopija je shranjena.',
  importHow: 'Kako uvozim podatke iz datoteke?',
  importMerge: 'Dodaj k obstoječim',
  importMergeHint: 'Novi rajoni, lokacije in razporedi se dodajo. Obstoječi ostanejo, kot so.',
  importReplaceAll: 'Zamenjaj vse',
  confirmImport: 'Si prepričana? Vsi trenutni podatki bodo izbrisani in zamenjani s podatki iz datoteke.',
  importReplace: 'Zamenjaj vse',
  importedMerge: (r, l, g) =>
    `Dodano: ${r} ${plural(r, ['rajon', 'rajona', 'rajoni', 'rajonov'])}, ${l} ${plural(l, ['lokacija', 'lokaciji', 'lokacije', 'lokacij'])}, ${g} ${plural(g, ['razpored', 'razporeda', 'razporedi', 'razporedov'])}.`,
  imported: 'Podatki so uvoženi.',
  importFailed: 'Datoteke ni bilo mogoče prebrati.',
  storageWarning: 'Telefon lahko ob pomanjkanju prostora izbriše podatke. Redno delaj varnostne kopije.',
};

/** 7. 11. 2026 */
export const formatDate = (d) => `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
