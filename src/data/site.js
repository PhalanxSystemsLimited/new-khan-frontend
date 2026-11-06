/**
 * Site content, taken from the approved Pakka build of the live site
 * (PhalanxSystemsLimited/NewKhan-Frontend, index.html). Fares, timings and most terminal addresses are
 * still PLACEHOLDERS on the live site too; see its DATA_NEEDED notes.
 */

export const PLACEHOLDER = true;
export const SITE_URL = "https://www.newkhan.pk";

export let company = {name:"New Khan",founded:1956,acSince:1983,fleet:{ac:10},helpline:"0311 1007555",helplineTel:"+923111007555",whatsapp:"923111007555",email:"info@newkhan.pk",bookmeUrl:"https://www.bookme.pk/",address:{street:"55 Lawrence Road",city:"Lahore",region:"Punjab",country:"PK"},addressUr:{street:"55 لارنس روڈ",city:"لاہور",region:"پنجاب",country:"پاکستان"},helplineHours:{en:"Daily, 8am to midnight",ur:"روزانہ، صبح 8 بجے سے رات 12 بجے تک"},social:{facebook:"https://www.facebook.com/NewKhan.Official",instagram:"",youtube:""}};

export const lahore = {id:"lahore",name:{en:"Lahore",ur:"لاہور"}};
export const multan = {id:"multan",name:{en:"Multan",ur:"ملتان"}};

/** Coach classes. */
export let busTypes = [{id:"ac",image:"/images/fleet/higer-2026.webp",name:{en:"AC",ur:"اے سی"},blurb:{en:"Air-conditioned coaches on our main routes. (Placeholder description.)",ur:"ہمارے مرکزی روٹس پر ایئر کنڈیشنڈ کوچیں۔ (عارضی تفصیل)"},features:[{en:"Air conditioning",ur:"ایئر کنڈیشنڈ"},{en:"Comfortable reclining seats",ur:"آرام دہ ریکلائننگ سیٹیں"},{en:"Luggage hold",ur:"سامان کے لیے الگ جگہ"}]}];

const addressTbc = {en:"Address to be confirmed",ur:"پتے کی تصدیق باقی ہے"};
const hoursTbc = {en:"First to last departure (placeholder)",ur:"پہلی سے آخری روانگی تک (عارضی)"};
const terminal = (id, en, ur) => ({
  id,
  city: { en, ur },
  name: { en: `New Khan ${en} Terminal`, ur: `نیو خان ${ur} ٹرمینل` },
  address: addressTbc,
  addressConfirmed: false,
  phone: company.helpline,
  hours: hoursTbc,
  mapQuery: `New Khan bus terminal ${en}, Pakistan`,
});

export let terminals = [
  {
    id: "lahore",
    city: { en: "Lahore", ur: "لاہور" },
    name: { en: "New Khan Head Office & Lahore Terminal", ur: "نیو خان ہیڈ آفس و لاہور ٹرمینل" },
    address: { en: "55 Lawrence Road, Lahore", ur: "55 لارنس روڈ، لاہور" },
    addressConfirmed: true,
    phone: company.helpline,
    hours: hoursTbc,
    mapQuery: "55 Lawrence Road, Lahore, Pakistan",
  },
  terminal("sargodha", "Sargodha", "سرگودھا"),
  terminal("mianwali", "Mianwali", "میانوالی"),
  terminal("bhakkar", "Bhakkar", "بھکر"),
  terminal("chashma", "Chashma", "چشمہ"),
  terminal("kamar-mushani", "Kamar Mushani", "کمر مشانی"),
  terminal("esakhel", "Esakhel", "عیسیٰ خیل"),
  terminal("di-khan", "DI Khan", "ڈیرہ اسماعیل خان"),
  terminal("multan", "Multan", "ملتان"),
];

/** Destinations from Lahore (one entry per town you can book to). PLACEHOLDER fares and times. */
export let cities = [{id:"sargodha",name:{en:"Sargodha",ur:"سرگودھا"},distanceKm:190,hours:3.5,via:{en:"Sheikhupura and Faisalabad Road",ur:"شیخوپورہ اور فیصل آباد روڈ کے راستے"},fares:{ac:900},fromLahore:["06:00","09:00","12:00","15:00","18:00","21:00"],toLahore:["05:30","08:30","11:30","14:30","17:30","20:30"]},
  {id:"khushab-joharabad",name:{en:"Khushab–Joharabad",ur:"خوشاب جوہرآباد"},minor:true,distanceKm:245,hours:4,via:{en:"Sargodha",ur:"سرگودھا کے راستے"},fares:{ac:1200},fromLahore:["07:00","11:00","15:00","20:00","23:00"],toLahore:["06:00","10:00","14:00","19:00","22:00"]},
  {id:"qaidabad",name:{en:"Qaidabad",ur:"قائد آباد"},minor:true,distanceKm:265,hours:4.5,via:{en:"Sargodha and Khushab–Joharabad",ur:"سرگودھا اور خوشاب جوہرآباد کے راستے"},fares:{ac:1300},fromLahore:["07:00","11:00","15:00","20:00","23:00"],toLahore:["06:00","10:00","14:00","19:00","22:00"]},
  {id:"mianwali",name:{en:"Mianwali",ur:"میانوالی"},distanceKm:290,hours:5,via:{en:"Sargodha, Khushab–Joharabad and Qaidabad",ur:"سرگودھا، خوشاب جوہرآباد اور قائد آباد کے راستے"},fares:{ac:1500},fromLahore:["07:00","11:00","15:00","20:00","23:00"],toLahore:["06:00","10:00","14:00","19:00","22:00"]},
  {id:"bhakkar",name:{en:"Bhakkar",ur:"بھکر"},distanceKm:330,hours:6,via:{en:"Direct Lahore to Bhakkar service",ur:"لاہور سے بھکر براہِ راست سروس"},fares:{ac:1700},fromLahore:["08:00","13:00","19:00","22:00"],toLahore:["07:00","12:00","18:00","21:00"]},
  {id:"chashma",name:{en:"Chashma",ur:"چشمہ"},distanceKm:360,hours:6.5,via:{en:"Sargodha, Khushab–Joharabad, Qaidabad and Mianwali",ur:"سرگودھا، خوشاب جوہرآباد، قائد آباد اور میانوالی کے راستے"},fares:{ac:1900},fromLahore:["09:00","14:00","21:00"],toLahore:["08:00","13:00","20:00"]},
  {id:"kot-chandna",name:{en:"Kot Chandna",ur:"کوٹ چاندنہ"},minor:true,distanceKm:310,hours:5.2,via:{en:"Sargodha, Khushab–Joharabad, Qaidabad and Mianwali",ur:"سرگودھا، خوشاب جوہرآباد، قائد آباد اور میانوالی کے راستے"},fares:{ac:1600},fromLahore:["08:30","14:30","21:30"],toLahore:["07:30","13:30","20:30"]},
  {id:"kamar-mushani",name:{en:"Kamar Mushani",ur:"کمر مشانی"},minor:true,distanceKm:322,hours:5.4,via:{en:"Mianwali and Kot Chandna",ur:"میانوالی اور کوٹ چاندنہ کے راستے"},fares:{ac:1650},fromLahore:["08:30","14:30","21:30"],toLahore:["07:30","13:30","20:30"]},
  {id:"esakhel",name:{en:"Esakhel",ur:"عیسیٰ خیل"},distanceKm:330,hours:5.5,via:{en:"Mianwali, Kot Chandna and Kamar Mushani",ur:"میانوالی، کوٹ چاندنہ اور کمر مشانی کے راستے"},fares:{ac:1700},fromLahore:["08:30","14:30","21:30"],toLahore:["07:30","13:30","20:30"]},
  {id:"di-khan",name:{en:"DI Khan",ur:"ڈیرہ اسماعیل خان"},distanceKm:450,hours:8,via:{en:"Mianwali and Chashma Barrage, or via Bhakkar",ur:"میانوالی اور چشمہ بیراج کے راستے، یا بھکر کے راستے"},fares:{ac:2500},fromLahore:["07:00","13:00","19:00","22:00"],toLahore:["06:00","12:00","18:00","21:00"]},
  {id:"multan",name:{en:"Multan",ur:"ملتان"},distanceKm:340,hours:5,via:{en:"M-3 / M-4 and Motorway network",ur:"ایم 3 / ایم 4 موٹروے کے راستے"},fares:{ac:1800},fromLahore:["06:00","09:00","12:00","15:00","18:00","22:00"],toLahore:["06:00","09:00","12:00","15:00","18:00","22:00"]}];

/** A terminal, or a pick-up point for towns without one. */
export function getTerminal(id) {
  const t = terminals.find((a) => a.id === id);
  if (t) return t;
  const name = cities.find((a) => a.id === id)?.name ?? { en: id, ur: id };
  return {
    id,
    city: name,
    name: { en: `${name.en} pick-up point`, ur: `${name.ur} اسٹاپ` },
    address: { en: "Pick-up and drop-off stop. Call the helpline for the exact spot.", ur: "مسافروں کو بٹھانے اور اتارنے کا اسٹاپ۔ صحیح جگہ جاننے کے لیے ہیلپ لائن پر کال کریں۔" },
    addressConfirmed: false,
    phone: company.helpline,
    hours: hoursTbc,
    mapQuery: `${name.en}, Pakistan`,
  };
}

const MULTAN_OUT = ["07:00","14:00","21:00"];
const MULTAN_BACK = ["06:30","13:30","20:30"];
/** Destinations on the Multan route (route 4), which does not pass through Lahore. */
export let multanLinks = [{id:"chowk-adam",name:{en:"Chowk Adam",ur:"چوک آدم"},minor:true,distanceKm:70,hours:1.3,via:{en:"Direct from Multan",ur:"ملتان سے براہِ راست"},fares:{ac:550},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"fateh-pur",name:{en:"Fateh Pur",ur:"فتح پور"},minor:true,distanceKm:120,hours:2.2,via:{en:"Chowk Adam",ur:"چوک آدم کے راستے"},fares:{ac:800},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"sarai-mahajar",name:{en:"Sarai Mahajar",ur:"سرائے مہاجر"},minor:true,distanceKm:160,hours:3,via:{en:"Chowk Adam and Fateh Pur",ur:"چوک آدم اور فتح پور کے راستے"},fares:{ac:1050},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"mianwali",name:{en:"Mianwali",ur:"میانوالی"},minor:true,distanceKm:280,hours:5,via:{en:"Chowk Adam, Fateh Pur and Sarai Mahajar",ur:"چوک آدم، فتح پور اور سرائے مہاجر کے راستے"},fares:{ac:1700},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"kot-chandna",name:{en:"Kot Chandna",ur:"کوٹ چاندنہ"},minor:true,distanceKm:300,hours:5.4,via:{en:"Mianwali",ur:"میانوالی کے راستے"},fares:{ac:1750},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"kamar-mushani",name:{en:"Kamar Mushani",ur:"کمر مشانی"},minor:true,distanceKm:315,hours:5.7,via:{en:"Mianwali and Kot Chandna",ur:"میانوالی اور کوٹ چاندنہ کے راستے"},fares:{ac:1850},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK},
  {id:"esakhel",name:{en:"Esakhel",ur:"عیسیٰ خیل"},distanceKm:330,hours:6,via:{en:"Mianwali, Kot Chandna and Kamar Mushani",ur:"میانوالی، کوٹ چاندنہ اور کمر مشانی کے راستے"},fares:{ac:1950},fromLahore:MULTAN_OUT,toLahore:MULTAN_BACK}];

export const stopKindLabel = {terminal:{en:"Main terminal",ur:"مین ٹرمینل"},counter:{en:"Counter",ur:"کاؤنٹر"},"counter-office":{en:"Counter and office",ur:"کاؤنٹر اور دفتر"},office:{en:"Office, no counter",ur:"صرف دفتر، کاؤنٹر نہیں"},stop:{en:"Pick-up and drop-off only",ur:"صرف مسافر بٹھانے اور اتارنے کا اسٹاپ"}};

/** The four promises under the home page hero. */
export let promises = [{title:{en:"A ticket number for every seat",ur:"ہر سیٹ کا ٹکٹ نمبر"},body:{en:"Every booking gets a written confirmation with a ticket number, so your seat is on record before you leave home.",ur:"ہر بکنگ پر ٹکٹ نمبر کے ساتھ تحریری تصدیق ملتی ہے، تاکہ گھر سے نکلنے سے پہلے آپ کی سیٹ ریکارڈ میں ہو۔"}},
  {title:{en:"Honoured at the counter",ur:"کاؤنٹر پر ٹکٹ کی پوری پاسداری"},body:{en:"Counter staff check the same list. Show your ticket number and your seat is held for you.",ur:"کاؤنٹر کا عملہ بھی یہی فہرست دیکھتا ہے۔ اپنا ٹکٹ نمبر دکھائیں، آپ کی سیٹ آپ ہی کے لیے رکھی ہو گی۔"}},
  {title:{en:"Clear refunds",ur:"ریفنڈ کے صاف اصول"},body:{en:"Our refund rules are written down, in plain words, on the Policies page. No surprises.",ur:"ریفنڈ کے اصول پالیسی کے صفحے پر سادہ الفاظ میں لکھے ہوئے ہیں۔ کوئی چھپی ہوئی شرط نہیں۔"}},
  {title:{en:"Someone answers",ur:"ہم جواب دیتے ہیں"},body:{en:"Call the helpline or message us on WhatsApp. If your problem is not fixed, ask for a supervisor.",ur:"ہیلپ لائن پر کال کریں یا واٹس ایپ پر پیغام بھیجیں۔ اگر مسئلہ حل نہ ہو تو سپروائزر سے بات کروانے کا کہیں۔"}}];

/** "Our journey" stops. */
export let heritage = [{year:"1956",text:{en:"New Khan starts running intercity buses from Lahore.",ur:"نیو خان نے لاہور سے دوسرے شہروں کے لیے بس سروس شروع کی۔"},image:"/images/journey/y1956.webp"},
  {year:"1983",text:{en:"New Khan introduces air-conditioned buses on its routes.",ur:"نیو خان نے اپنے روٹس پر اے سی بسیں متعارف کرائیں۔"},image:"/images/journey/y1983.webp"},
  {year:"Today",text:{en:"Daily air-conditioned departures from Lahore, with terminals in every city we serve.",ur:"لاہور سے روزانہ اے سی روانگیاں، اور ہم جس شہر میں جاتے ہیں وہاں ہمارا ٹرمینل۔"},image:"/images/journey/today-2026.webp"}];

export let team = [{id:"drivers",image:"/images/team/drivers-2026.webp",title:{en:"Our drivers",ur:"ہمارے ڈرائیور"},body:{en:"Behind the wheel on every route.",ur:"ہر روٹ پر اسٹیئرنگ سنبھالے ہوئے۔"}},
  {id:"counter",image:"/images/team/counter-2026.webp",title:{en:"Counter team",ur:"کاؤنٹر ٹیم"},body:{en:"Here to help you at every terminal.",ur:"ہر ٹرمینل پر آپ کی مدد کے لیے حاضر۔"}},
  {id:"helpline",image:"/images/team/helpline-2026.webp",title:{en:"Helpline team",ur:"ہیلپ لائن ٹیم"},body:{en:"Answering calls and WhatsApp messages.",ur:"کالز اور واٹس ایپ پیغامات کا جواب دیتے ہیں۔"}},
  {id:"workshop",image:"/images/team/workshop-2026.webp",title:{en:"Workshop crew",ur:"ورکشاپ کا عملہ"},body:{en:"Keeping every coach road-ready.",ur:"ہر بس کو سفر کے لیے تیار رکھتے ہیں۔"}}];

/** Home page FAQ ("Before you book"). */
export let generalFaq = [{q:{en:"How do I book a seat?",ur:"میں سیٹ کیسے بُک کروں؟"},a:{en:"Press Book a seat. WhatsApp opens with your route and date filled in. Send it and we reply with your seat and ticket number. You can also call the helpline.",ur:"’سیٹ بُک کریں‘ کا بٹن دبائیں۔ واٹس ایپ کھلے گا اور اس میں آپ کا روٹ اور تاریخ پہلے سے لکھے ہوں گے۔ پیغام بھیج دیں، ہم جواب میں آپ کی سیٹ اور ٹکٹ نمبر بتا دیں گے۔ آپ ہیلپ لائن پر کال بھی کر سکتے ہیں۔"}},
  {q:{en:"What do I show at the counter?",ur:"کاؤنٹر پر کیا دکھانا ہو گا؟"},a:{en:"Your ticket number and a photo ID. Arrive at least 30 minutes before departure.",ur:"اپنا ٹکٹ نمبر اور تصویر والا شناختی کارڈ۔ روانگی سے کم از کم 30 منٹ پہلے پہنچیں۔"}},
  {q:{en:"Can I get a refund?",ur:"کیا ریفنڈ مل سکتا ہے؟"},a:{en:"Yes. Our refund rules are on the Policies page. To ask for a refund, send your ticket number on WhatsApp or call the helpline.",ur:"جی ہاں۔ ریفنڈ کے اصول پالیسی کے صفحے پر ہیں۔ ریفنڈ کے لیے واٹس ایپ پر ٹکٹ نمبر بھیجیں یا ہیلپ لائن پر کال کریں۔"}}];

/** The four promises, as the About page calls them. */
export let commitments = promises;

/** Closing line of the Cargo and Charter enquiry intros. */
export let cargoOrCharterNote = { en: "We reply by phone or WhatsApp with a quote.", ur: "ہم فون یا واٹس ایپ پر آپ کو ریٹ بتا دیں گے۔" };

/** Head office address on one line: "55 Lawrence Road, Lahore, Pakistan" (with the province if asked). */
export function officeAddress(lang, { region = false } = {}) {
  const a = lang === "ur" ? company.addressUr : { ...company.address, country: "Pakistan" };
  return [a.street, a.city, ...(region ? [a.region] : []), a.country].join(lang === "ur" ? "، " : ", ");
}

/* ------------------------------------------------------------------ admin-edited content */

/** The content above as built into the site (the admin panel's "Reset to default" goes back to this). */
export const siteBuiltIn = structuredClone({
  company, terminals, destinations: cities, multanLinks, busTypes, promises, heritage, team, faq: generalFaq, cargoNote: cargoOrCharterNote,
});

/**
 * Replaces sections with the versions saved in the admin panel (GET /content). Called once in main.jsx before the
 * app loads, so every page reads the saved text. Sections missing from `c` keep the built-in text.
 */
export function applySiteContent(c = {}) {
  if (c.company && typeof c.company === "object") company = { ...siteBuiltIn.company, ...c.company };
  if (Array.isArray(c.terminals)) terminals = c.terminals;
  if (Array.isArray(c.destinations)) cities = c.destinations;
  if (Array.isArray(c.multanLinks)) multanLinks = c.multanLinks;
  if (Array.isArray(c.busTypes) && c.busTypes.length) busTypes = c.busTypes;
  if (Array.isArray(c.promises)) commitments = promises = c.promises;
  if (Array.isArray(c.heritage)) heritage = c.heritage;
  if (Array.isArray(c.team)) team = c.team;
  if (Array.isArray(c.faq)) generalFaq = c.faq;
  if (c.cargoNote && typeof c.cargoNote === "object") cargoOrCharterNote = c.cargoNote;
}
