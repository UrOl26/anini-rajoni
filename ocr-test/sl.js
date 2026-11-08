// All user-facing text for the OCR test page, in Slovenian.
export const sl = {
  title: 'Test branja imen',
  loading: 'Nalagam bralnik …',
  ready: (s) => `Bralnik je pripravljen (${s} s). Usmeri kamero v ime na nabiralniku.`,
  loadFailed: 'Bralnika ni bilo mogoče naložiti.',
  cameraStarting: 'Zaganjam kamero …',
  cameraFailed: 'Kamere ni bilo mogoče odpreti. Preveri dovoljenje za kamero.',
  reading: 'Berem …',
  paused: 'Branje je ustavljeno.',
  start: 'Začni brati',
  stop: 'Ustavi',
  confidence: 'Zanesljivost',
  lastRead: 'Zadnje branje',
  average: 'Povprečje',
  reads: 'Branj',
  modeLine: 'Ena vrstica',
  modeBlock: 'Več vrstic',
  torchOn: 'Prižgi svetilko',
  torchOff: 'Ugasni svetilko',
  savedTitle: 'Prebrana imena',
  savedHint: 'Ime se shrani, ko ga bralnik dvakrat zapored prebere enako.',
  copy: 'Kopiraj rezultate',
  clear: 'Počisti',
  copied: 'Rezultati so kopirani.',
  cleared: 'Rezultati so počiščeni.',
  device: 'Naprava',
  camera: 'Kamera',
  modelLoad: 'Nalaganje bralnika',
};

// Slovenian number formatting: decimal comma, e.g. 1,5
export const fmt = (n, digits = 1) =>
  n.toLocaleString('sl-SI', { minimumFractionDigits: digits, maximumFractionDigits: digits });
