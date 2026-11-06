/** Languages. Every visitor-facing string is a bilingual { en, ur } object. */
export const LANGS = ["en", "ur"];
export const DEFAULT_LANG = "en";
export const isLang = (v) => v === "en" || v === "ur";
export const dirOf = (lang) => (lang === "ur" ? "rtl" : "ltr");
export const otherLang = (lang) => (lang === "en" ? "ur" : "en");

/** Interface strings. Page copy lives in src/data/site.js or in the page itself. */
export const ui = {
  // navigation
  navRoutes: { en: "Routes", ur: "روٹس" },
  navTerminals: { en: "Terminals", ur: "ٹرمینلز" },
  navFleet: { en: "Fleet & Routes", ur: "بسیں اور روٹس" },
  navAbout: { en: "About", ur: "ہمارے بارے میں" },
  navPolicies: { en: "Policies", ur: "پالیسیاں" },
  navPrivacy: { en: "Privacy policy", ur: "رازداری کی پالیسی" },
  navTerms: { en: "Terms and conditions", ur: "شرائط و ضوابط" },
  navRefund: { en: "Refund and cancellation", ur: "ریفنڈ اور منسوخی" },
  navShipping: { en: "Service delivery", ur: "سروس کی فراہمی" },
  legal: { en: "Legal", ur: "قانونی" },
  navContact: { en: "Contact", ur: "رابطہ" },
  navCharter: { en: "Charter a bus", ur: "بس کرائے پر لیں" },
  navCargo: { en: "Parcels & cargo", ur: "پارسل اور کارگو" },
  navManage: { en: "Manage booking", ur: "بکنگ مینیج کریں" },
  navServices: { en: "Services", ur: "سروسز" },
  menu: { en: "Menu", ur: "مینو" },
  switchLang: { en: "اردو", ur: "English" },
  skip: { en: "Skip to content", ur: "مواد پر جائیں" },

  // calls to action
  book: { en: "Book a seat", ur: "سیٹ بُک کریں" },
  callHelpline: { en: "Call helpline", ur: "ہیلپ لائن پر کال کریں" },
  bookme: { en: "Book on Bookme", ur: "بُک می پر بُک کریں" },
  orBookVia: { en: "Or book by", ur: "یا بکنگ کے لیے" },
  whatsappNote: {
    en: "Opens WhatsApp with your route and date filled in.",
    ur: "واٹس ایپ کھلے گا اور اس میں آپ کا روٹ اور تاریخ پہلے سے لکھے ہوں گے۔",
  },
  call: { en: "Call", ur: "کال" },

  // search
  from: { en: "From", ur: "روانگی" },
  to: { en: "To", ur: "منزل" },
  date: { en: "Travel date", ur: "سفر کی تاریخ" },
  seats: { en: "Seats", ur: "سیٹیں" },
  swap: { en: "Swap from and to", ur: "روانگی اور منزل آپس میں بدلیں" },
  seeFares: { en: "See fares & timings", ur: "کرایہ اور اوقات دیکھیں" },
  chooseCity: { en: "Choose city", ur: "شہر منتخب کریں" },
  sameCity: { en: "Please choose two different cities.", ur: "براہِ کرم دو مختلف شہر منتخب کریں۔" },
  noDirect: {
    en: "We don't list a direct bus for that pair yet. Ask us on WhatsApp and we will tell you the best way to travel.",
    ur: "ان دو شہروں کے درمیان ابھی ہماری کوئی براہِ راست بس درج نہیں۔ واٹس ایپ پر پوچھ لیں، ہم آپ کو سفر کا بہترین طریقہ بتا دیں گے۔",
  },
  askWhatsapp: { en: "Ask on WhatsApp", ur: "واٹس ایپ پر پوچھیں" },

  // generic labels
  fare: { en: "Fare", ur: "کرایہ" },
  fares: { en: "Fares", ur: "کرائے" },
  timings: { en: "Departure timings", ur: "روانگی کے اوقات" },
  perSeat: { en: "per seat", ur: "فی سیٹ" },
  duration: { en: "Journey time", ur: "سفر کا وقت" },
  distance: { en: "Distance", ur: "فاصلہ" },
  approx: { en: "approx.", ur: "تقریباً" },
  hoursShort: { en: "hrs", ur: "گھنٹے" },
  km: { en: "km", ur: "کلومیٹر" },
  busType: { en: "Bus type", ur: "بس کی قسم" },
  busTypes: { en: "Bus types", ur: "بسوں کی اقسام" },
  terminals: { en: "Terminals", ur: "ٹرمینلز" },
  boardingAt: { en: "Boarding points", ur: "سوار ہونے کے مقامات" },
  address: { en: "Address", ur: "پتہ" },
  phone: { en: "Phone", ur: "فون" },
  hours: { en: "Opening hours", ur: "اوقاتِ کار" },
  openMap: { en: "Open in Google Maps", ur: "گوگل میپس میں کھولیں" },
  faq: { en: "Frequently asked questions", ur: "اکثر پوچھے جانے والے سوالات" },
  relatedRoutes: { en: "Other routes", ur: "دیگر روٹس" },
  allRoutes: { en: "All routes", ur: "تمام روٹس" },
  viewRoute: { en: "View fares & timings", ur: "کرایہ اور اوقات دیکھیں" },
  fromFare: { en: "from", ur: "کم از کم" },
  readMore: { en: "Read more", ur: "مزید پڑھیں" },
  home: { en: "Home", ur: "ہوم" },
  departures: { en: "departures a day", ur: "روانگیاں روزانہ" },

  // placeholder notice
  placeholderTitle: { en: "Placeholder data", ur: "عارضی معلومات" },
  placeholderBody: {
    en: "Fares and timings shown here are placeholders. Confirm the current fare and departure with us before you travel.",
    ur: "یہاں دیے گئے کرائے اور اوقات عارضی ہیں۔ سفر سے پہلے موجودہ کرائے اور روانگی کے وقت کی ہم سے تصدیق کر لیں۔",
  },
  confirmOnWhatsapp: { en: "Confirm on WhatsApp", ur: "واٹس ایپ پر تصدیق کریں" },
  sample: { en: "Sample text", ur: "نمونہ" },

  // forms
  name: { en: "Your name", ur: "آپ کا نام" },
  phoneField: { en: "Phone / WhatsApp", ur: "فون / واٹس ایپ" },
  email: { en: "Email (optional)", ur: "ای میل (اختیاری)" },
  message: { en: "Message", ur: "پیغام" },
  send: { en: "Send enquiry", ur: "درخواست بھیجیں" },
  sending: { en: "Sending…", ur: "بھیجا جا رہا ہے…" },
  sent: {
    en: "Thank you. We have your enquiry and will contact you on the number you gave.",
    ur: "شکریہ۔ آپ کی درخواست ہمیں مل گئی ہے۔ ہم آپ کے دیے ہوئے نمبر پر رابطہ کریں گے۔",
  },
  sendFailed: {
    en: "We could not send your enquiry. Please message us on WhatsApp or call the helpline instead.",
    ur: "آپ کی درخواست نہیں بھیجی جا سکی۔ براہِ کرم واٹس ایپ پر پیغام بھیجیں یا ہیلپ لائن پر کال کریں۔",
  },
  required: { en: "Required", ur: "ضروری" },
  fromCity: { en: "Pick-up city", ur: "روانگی کا شہر" },
  toCity: { en: "Destination", ur: "منزل" },
  passengers: { en: "Number of passengers", ur: "مسافروں کی تعداد" },
  notes: { en: "Anything else we should know", ur: "کوئی اور ضروری بات" },
  item: { en: "Exact description of the item", ur: "سامان کی درست تفصیل" },
  itemHint: { en: "Say exactly what it is, its size and how it is packed. Example: 2 cartons of school books, 40 x 30 x 30 cm each, taped.", ur: "صاف لکھیں کہ کیا چیز ہے، اس کا سائز کیا ہے اور کیسے پیک کی گئی ہے۔ مثال: اسکول کی کتابوں کے 2 کارٹن، ہر ایک 40 x 30 x 30 سینٹی میٹر، ٹیپ سے بند۔" },
  weight: { en: "Total weight (kg)", ur: "کل وزن (کلو)" },
  weightHint: { en: "Weight of everything together, in kilograms. We re-weigh at the terminal.", ur: "تمام سامان کا کل وزن، کلوگرام میں۔ ٹرمینل پر سامان دوبارہ تولا جاتا ہے۔" },
  pieces: { en: "Number of pieces", ur: "نگوں کی تعداد" },
  senderName: { en: "Sender name", ur: "بھیجنے والے کا نام" },
  senderPhone: { en: "Sender phone / WhatsApp", ur: "بھیجنے والے کا فون / واٹس ایپ" },
  receiverName: { en: "Receiver name", ur: "وصول کرنے والے کا نام" },
  receiverPhone: { en: "Receiver phone", ur: "وصول کرنے والے کا فون" },
  sendTerminal: { en: "Drop off at", ur: "جمع کرانے کا ٹرمینل" },
  recvTerminal: { en: "Collect at", ur: "وصولی کا ٹرمینل" },
  chooseTerminal: { en: "Choose terminal", ur: "ٹرمینل منتخب کریں" },
  errItem: { en: "Describe the item in at least a few words, with size and packing.", ur: "سامان کی تفصیل کم از کم چند الفاظ میں، سائز اور پیکنگ سمیت لکھیں۔" },
  errWeight: { en: "Enter the weight in kilograms, for example 12.5.", ur: "وزن کلوگرام میں لکھیں، مثلاً 12.5۔" },
  errGeneric: { en: "Please check this field.", ur: "براہِ کرم یہ خانہ چیک کریں۔" },
  cargoRef: { en: "Consignment number", ur: "کنسائنمنٹ نمبر" },
  cargoSent: { en: "Your parcel request is in. Keep this number: staff will ask for it at the terminal.", ur: "آپ کی پارسل کی درخواست ہمیں مل گئی ہے۔ یہ نمبر سنبھال کر رکھیں، ٹرمینل پر عملہ یہی نمبر مانگے گا۔" },
  downloadReceipt: { en: "Download parcel receipt (PDF)", ur: "پارسل کی رسید ڈاؤن لوڈ کریں (PDF)" },
  returnTrip: { en: "Return trip needed", ur: "واپسی کا سفر بھی چاہیے" },

  // footer / misc
  helpline: { en: "Helpline", ur: "ہیلپ لائن" },
  headOffice: { en: "Head office", ur: "ہیڈ آفس" },
  quickLinks: { en: "Quick links", ur: "اہم لنکس" },
  rights: { en: "All rights reserved.", ur: "جملہ حقوق محفوظ ہیں۔" },
  since: { en: "Since 1956", ur: "1956 سے" },
  cargoStripTitle: { en: "Sending a parcel?", ur: "پارسل بھیجنا ہے؟" },
  cargoStripBody: { en: "We carry parcels and cargo between our terminals on scheduled buses.", ur: "ہم اپنے ٹرمینلز کے درمیان شیڈول بسوں پر پارسل اور کارگو لے جاتے ہیں۔" },
  cargoStripLink: { en: "Get a cargo quote", ur: "کارگو کا ریٹ پوچھیں" },
  cargoRouteLine: { en: "Sending a parcel on this route?", ur: "اس روٹ پر پارسل بھیجنا ہے؟" },
};

export const u = (key, lang) => ui[key][lang];
