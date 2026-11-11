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
  scanAddressHint: 'Usmeri kamero v hišno tablico ali naslov na pismu.',
  addressNotFound: 'Naslova ni bilo mogoče prebrati.',
  manageList: 'Uredi seznam',
  reorderTitle: 'Urejanje seznama',
  noRoutes: 'Še nimaš nobenega rajona.',
  noLocations: 'V tem rajonu še ni lokacij.',
  noResults: 'Ni zadetkov',
  confirmDeleteLocation:
    'Si prepričana, da želiš izbrisati? Izbrisan bo tudi razpored nabiralnikov in vsa imena.',
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
  confirmRemoveNamed: 'Si prepričana, da želiš izbrisati? Ti nabiralniki imajo vpisana imena.',
  notInUse: 'Nabiralnik ni v uporabi',

  // 5.3 Scanner
  scanNames: 'Skeniraj imena',
  skip: 'Preskoči',
  enterManually: 'Vpiši ročno',
  addToPrevious: 'Dodaj ime prejšnjemu nabiralniku',
  scanningPrevious: (n) => `Dodajam imena nabiralniku ${n}.`,
  pointAt: (n) => `Usmeri kamero v ime na nabiralniku ${n}.`,
  reading: 'Berem …',
  noName: 'Ni berljivega imena.',
  allScanned: 'Vsi nabiralniki so skenirani.',
  maxNames: 'Največ 5 imen na nabiralnik.',
  cameraStarting: 'Zaganjam kamero …',
  cameraFailed: 'Kamere ni bilo mogoče odpreti. Preveri dovoljenje za kamero.',
  needInternet: 'Za skeniranje potrebuješ internet.',
  needKey: 'Za skeniranje najprej vpiši API ključ v nastavitvah.',
  openSettings: 'Odpri nastavitve',
  errAuth: 'API ključ ni veljaven. Preveri ga v nastavitvah.',
  errBusy: 'Strežnik je zaseden. Poskušam znova …',
  errOther: 'Branje ni uspelo. Poskušam znova …',
  familyName: 'Priimek',
  familyNamePlaceholder: 'npr. Novak',
  torchOn: 'Prižgi svetilko',
  torchOff: 'Ugasni svetilko',

  // Mailbox and names
  mailbox: (n) => `Nabiralnik ${n}`,
  position: (n, row, col) => `Nabiralnik ${n} · ${row}. vrsta, ${col}. od leve`,
  addName: 'Dodaj ime',
  noNamesYet: 'Ta nabiralnik še nima imena.',
  deleteName: (name) => `Izbriši ${name}`,

  // 5.4 Search
  searchName: 'Išči priimek …',
  clearSearch: 'Počisti iskanje',
  scanLetter: 'Skeniraj pismo',
  scanLetterHint: 'Usmeri kamero v ime na pismu.',
  pickFamilyName: 'Kateri je priimek?',
  matches: (n) => `${n} ${plural(n, ['zadetek', 'zadetka', 'zadetki', 'zadetkov'])}`,
  tapMailboxToAdd: (name) => `Tapni nabiralnik, kamor spada ${name}.`,

  // 5.5 Learning
  learnAddEmpty: (name, n) => `Dodam priimek ${name} v nabiralnik ${n}?`,
  learnHasOne: (n, existing) => `Nabiralnik ${n} že ima ime: ${existing}. Kaj želiš narediti?`,
  learnHasMany: (n, existing) =>
    `Nabiralnik ${n} že ima imena: ${existing}. Kaj želiš narediti?`,
  addToExistingOne: 'Dodaj k obstoječemu',
  addToExistingMany: 'Dodaj k obstoječim',
  replaceExistingOne: 'Zamenjaj obstoječe',
  replaceMany: 'Zamenjaj',
  replaceWhich: (name) => `Kaj zamenjam s priimkom ${name}?`,
  allNames: 'Vsa imena',

  // Settings and backups
  settings: 'Nastavitve',
  apiKey: 'API ključ',
  apiKeyHint: 'Potreben je za skeniranje. Shrani se samo na tem telefonu.',
  apiKeySaved: 'Ključ je shranjen.',
  apiKeyPlaceholder: 'sk-ant-…',
  deleteKey: 'Izbriši ključ',
  backup: 'Varnostna kopija',
  backupHint: 'Shrani kopijo vseh rajonov, razporedov in imen, npr. v Datoteke ali iCloud Drive.',
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
