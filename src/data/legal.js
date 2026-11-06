/**
 * Refund, service delivery, travel, privacy and terms: the legal documents, taken from the approved Pakka build
 * (PhalanxSystemsLimited/NewKhan-Frontend, index.html). Company details (address, helpline, email) are written
 * out in full as they appear there; update them here if they change in src/data/site.js.
 *
 * Each document: id, title, summary, and sections of { h, p?, list? } (all { en, ur }).
 * A section with a list shows the list first, then its paragraphs.
 */

/** Date the documents were last changed, shown on every policy page. */
export let legalUpdated = {"en":"24 October 2026","ur":"24 اکتوبر 2026"};

export let legalDocs = [
 {
  "id": "refund",
  "title": {
   "en": "Refund and cancellation policy",
   "ur": "ریفنڈ اور منسوخی کی پالیسی"
  },
  "summary": {
   "en": "When you can cancel, how much comes back, and how fast it reaches you.",
   "ur": "آپ کب منسوخ کر سکتے ہیں، کتنی رقم واپس ملے گی، اور وہ کتنی جلدی آپ تک پہنچے گی۔"
  },
  "sections": [
   {
    "h": {
     "en": "Who this applies to",
     "ur": "یہ پالیسی کن پر لاگو ہوتی ہے"
    },
    "p": [
     {
      "en": "This policy covers seat tickets, charters and parcels booked with New Khan, whether online on this website, on WhatsApp, by phone or at a New Khan counter.",
      "ur": "یہ پالیسی نیو خان کے ساتھ بک کیے گئے سیٹ ٹکٹوں، چارٹر اور پارسل پر لاگو ہوتی ہے، چاہے بکنگ اس ویب سائٹ پر آن لائن کی گئی ہو، واٹس ایپ پر، فون پر یا نیو خان کے کسی کاؤنٹر پر۔"
     }
    ]
   },
   {
    "h": {
     "en": "Cancelling a seat ticket",
     "ur": "سیٹ ٹکٹ کی منسوخی"
    },
    "list": [
     {
      "en": "24 hours or more before departure: full refund of the fare minus a cancellation fee of 10%.",
      "ur": "روانگی سے 24 گھنٹے یا اس سے زیادہ پہلے: 10% منسوخی فیس کاٹ کر باقی پورا کرایہ واپس کیا جائے گا۔"
     },
     {
      "en": "Between 6 and 24 hours before departure: 50% of the fare is refunded.",
      "ur": "روانگی سے 6 سے 24 گھنٹے پہلے: کرایے کا 50% واپس کیا جائے گا۔"
     },
     {
      "en": "Less than 6 hours before departure, or not boarding the bus (a no-show): no refund.",
      "ur": "روانگی سے 6 گھنٹے سے کم وقت پہلے منسوخی، یا بس میں سوار نہ ہونے کی صورت میں: کوئی ریفنڈ نہیں دیا جائے گا۔"
     },
     {
      "en": "Instead of cancelling, you can move your ticket to another date or departure on the same route once, free of charge, up to 6 hours before departure, if a seat is available. Any difference in fare is charged or refunded.",
      "ur": "منسوخ کرنے کے بجائے، اگر سیٹ دستیاب ہو تو آپ روانگی سے 6 گھنٹے پہلے تک اپنا ٹکٹ ایک بار مفت اسی روٹ پر کسی اور تاریخ یا روانگی پر منتقل کر سکتے ہیں۔ کرایے میں جو بھی فرق ہو وہ وصول یا واپس کیا جائے گا۔"
     }
    ]
   },
   {
    "h": {
     "en": "When New Khan cancels or changes a trip",
     "ur": "جب نیو خان کوئی سفر منسوخ یا تبدیل کرے"
    },
    "p": [
     {
      "en": "If we cancel a departure, or it leaves more than 2 hours later than the time on your ticket, you can choose a full refund with no fee or a free move to another departure. Online payment fees are refunded too.",
      "ur": "اگر ہم کوئی روانگی منسوخ کر دیں، یا بس آپ کے ٹکٹ پر درج وقت سے 2 گھنٹے سے زیادہ تاخیر سے روانہ ہو، تو آپ بغیر کسی فیس کے مکمل ریفنڈ یا کسی اور روانگی پر مفت منتقلی میں سے انتخاب کر سکتے ہیں۔ آن لائن ادائیگی کی فیس بھی واپس کی جائے گی۔"
     }
    ]
   },
   {
    "h": {
     "en": "Charters and parcels",
     "ur": "چارٹر اور پارسل"
    },
    "list": [
     {
      "en": "Charter: the deposit is refunded in full if you cancel 72 hours or more before the agreed pick-up time. After that the deposit is kept to cover the coach and driver set aside for you.",
      "ur": "چارٹر: اگر آپ طے شدہ پک اپ کے وقت سے 72 گھنٹے یا اس سے زیادہ پہلے منسوخ کریں تو پوری ایڈوانس رقم واپس کی جائے گی۔ اس کے بعد ایڈوانس رقم واپس نہیں ہوگی کیونکہ آپ کے لیے کوچ اور ڈرائیور مختص کیے جا چکے ہوتے ہیں۔"
     },
     {
      "en": "Parcels: the charge is refunded in full if the parcel has not yet been loaded onto a coach. Once it is on its way it cannot be cancelled.",
      "ur": "پارسل: اگر پارسل ابھی کوچ میں لوڈ نہیں ہوا تو پوری رقم واپس کی جائے گی۔ پارسل روانہ ہونے کے بعد اسے منسوخ نہیں کیا جا سکتا۔"
     }
    ]
   },
   {
    "h": {
     "en": "How to ask for a refund",
     "ur": "ریفنڈ کی درخواست کیسے کریں"
    },
    "p": [
     {
      "en": "Send your ticket or consignment number on WhatsApp, call the helpline, email us, or visit any New Khan counter. You will get a written confirmation of the amount being refunded.",
      "ur": "اپنا ٹکٹ نمبر یا کنسائنمنٹ نمبر واٹس ایپ پر بھیجیں، ہیلپ لائن پر کال کریں، ہمیں ای میل کریں، یا نیو خان کے کسی بھی کاؤنٹر پر تشریف لائیں۔ واپس کی جانے والی رقم کی تحریری تصدیق آپ کو دی جائے گی۔"
     }
    ]
   },
   {
    "h": {
     "en": "How and when you are paid back",
     "ur": "رقم کیسے اور کب واپس ملے گی"
    },
    "list": [
     {
      "en": "Refunds go back to the same method you paid with: card, bank account or mobile wallet. Cash paid at a counter is refunded in cash at a counter.",
      "ur": "ریفنڈ اسی طریقے سے واپس کیا جاتا ہے جس سے آپ نے ادائیگی کی تھی: کارڈ، بینک اکاؤنٹ یا موبائل والیٹ۔ کاؤنٹر پر نقد ادا کی گئی رقم کاؤنٹر پر ہی نقد واپس کی جاتی ہے۔"
     },
     {
      "en": "We start the refund within 7 working days of approving it. Your bank or wallet provider may take up to a further 14 working days to show it in your account.",
      "ur": "منظوری کے بعد 7 کاروباری دنوں کے اندر ہم ریفنڈ کا عمل شروع کر دیتے ہیں۔ آپ کے بینک یا والیٹ کمپنی کو یہ رقم آپ کے اکاؤنٹ میں دکھانے میں مزید 14 کاروباری دن تک لگ سکتے ہیں۔"
     },
     {
      "en": "Seat tickets are a service and nothing physical is sold, so there is nothing to return.",
      "ur": "سیٹ ٹکٹ ایک سروس ہے اور اس میں کوئی چیز فروخت نہیں کی جاتی، اس لیے کچھ واپس کرنے کی ضرورت نہیں۔"
     }
    ]
   }
  ]
 },
 {
  "id": "shipping",
  "title": {
   "en": "Service delivery policy",
   "ur": "سروس کی فراہمی کی پالیسی"
  },
  "summary": {
   "en": "What you receive after paying, when, and how the service is delivered.",
   "ur": "ادائیگی کے بعد آپ کو کیا ملتا ہے، کب ملتا ہے، اور سروس کیسے فراہم کی جاتی ہے۔"
  },
  "sections": [
   {
    "h": {
     "en": "What we sell",
     "ur": "ہم کیا فروخت کرتے ہیں"
    },
    "p": [
     {
      "en": "New Khan sells intercity bus travel in air-conditioned coaches between Lahore, Multan, Sargodha, Mianwali, Bhakkar, Chashma, Esakhel, DI Khan and the towns on those routes, as well as whole-coach charters and terminal-to-terminal parcel carriage. All are services: no physical goods are shipped to your address.",
      "ur": "نیو خان لاہور، ملتان، سرگودھا، میانوالی، بھکر، چشمہ، عیسیٰ خیل، ڈیرہ اسماعیل خان اور ان روٹس پر واقع قصبوں کے درمیان ایئر کنڈیشنڈ کوچز میں بس سفر کی سہولت فراہم کرتا ہے، اور ساتھ ہی پوری کوچ چارٹر پر دینے اور ایک ٹرمینل سے دوسرے ٹرمینل تک پارسل پہنچانے کی سروس بھی۔ یہ سب سروسز ہیں: کوئی سامان آپ کے پتے پر نہیں بھیجا جاتا۔"
     }
    ]
   },
   {
    "h": {
     "en": "Your e-ticket",
     "ur": "آپ کا ای ٹکٹ"
    },
    "list": [
     {
      "en": "As soon as an online payment is confirmed, your e-ticket and ticket number are shown on screen and can be downloaded as a PDF. A copy is sent by SMS, WhatsApp or email.",
      "ur": "آن لائن ادائیگی کی تصدیق ہوتے ہی آپ کا ای ٹکٹ اور ٹکٹ نمبر اسکرین پر دکھا دیا جاتا ہے، اور اسے PDF کی صورت میں ڈاؤن لوڈ کیا جا سکتا ہے۔ اس کی ایک کاپی SMS، واٹس ایپ یا ای میل کے ذریعے بھیجی جاتی ہے۔"
     },
     {
      "en": "If you do not receive it within 30 minutes of paying, contact us with your payment reference and we will reissue it.",
      "ur": "اگر ادائیگی کے 30 منٹ کے اندر آپ کو ٹکٹ نہ ملے تو اپنے ادائیگی ریفرنس کے ساتھ ہم سے رابطہ کریں، ہم ٹکٹ دوبارہ جاری کر دیں گے۔"
     }
    ]
   },
   {
    "h": {
     "en": "When the service is delivered",
     "ur": "سروس کب فراہم کی جاتی ہے"
    },
    "list": [
     {
      "en": "Seat tickets: on the date and departure booked. Please reach the departure terminal at least 30 minutes early with your ticket number and CNIC.",
      "ur": "سیٹ ٹکٹ: بک کی گئی تاریخ اور روانگی پر۔ براہ کرم اپنے ٹکٹ نمبر اور شناختی کارڈ کے ساتھ روانگی کے ٹرمینل پر کم از کم 30 منٹ پہلے پہنچیں۔"
     },
     {
      "en": "Charters: on the date, time and pick-up point agreed in writing when the charter is confirmed.",
      "ur": "چارٹر: اس تاریخ، وقت اور پک اپ مقام پر جو چارٹر کی تصدیق کے وقت تحریری طور پر طے کیے گئے ہوں۔"
     },
     {
      "en": "Parcels: carried on our scheduled coaches and ready to collect at the destination terminal, usually the same or next day. Collection needs the consignment number and the receiver's CNIC. We do not deliver door to door.",
      "ur": "پارسل: ہماری باقاعدہ شیڈول کوچز پر لے جائے جاتے ہیں اور عام طور پر اسی دن یا اگلے دن منزل کے ٹرمینل پر وصولی کے لیے تیار ہوتے ہیں۔ وصولی کے لیے کنسائنمنٹ نمبر اور وصول کنندہ کا شناختی کارڈ ضروری ہے۔ ہم گھر تک ڈیلیوری نہیں کرتے۔"
     }
    ]
   },
   {
    "h": {
     "en": "Where we operate",
     "ur": "ہم کہاں سروس دیتے ہیں"
    },
    "p": [
     {
      "en": "We operate within Pakistan only, on the routes listed on our Fleet and Routes page. Prices are in Pakistani rupees (PKR).",
      "ur": "ہم صرف پاکستان کے اندر ان روٹس پر سروس دیتے ہیں جو ہمارے بسیں اور روٹس کے صفحے پر درج ہیں۔ قیمتیں پاکستانی روپے (PKR) میں ہیں۔"
     }
    ]
   }
  ]
 },
 {
  "id": "travel",
  "title": {
   "en": "Luggage, safety and travel rules",
   "ur": "سامان، حفاظت اور سفر کے اصول"
  },
  "summary": {
   "en": "What you can bring, and what keeps every trip safe and comfortable.",
   "ur": "آپ کیا ساتھ لا سکتے ہیں، اور کن باتوں سے ہر سفر محفوظ اور آرام دہ رہتا ہے۔"
  },
  "sections": [
   {
    "h": {
     "en": "Luggage",
     "ur": "سامان"
    },
    "list": [
     {
      "en": "Each passenger may bring one suitcase up to 20 kg in the hold and one small hand bag, free.",
      "ur": "ہر مسافر سامان کے خانے میں 20 کلو تک کا ایک سوٹ کیس اور ایک چھوٹا ہینڈ بیگ مفت لے جا سکتا ہے۔"
     },
     {
      "en": "Extra luggage is charged by weight at the counter, if there is space.",
      "ur": "جگہ ہونے کی صورت میں اضافی سامان کا کرایہ کاؤنٹر پر وزن کے حساب سے لیا جاتا ہے۔"
     },
     {
      "en": "Keep cash, jewellery, documents and electronics with you. New Khan is not responsible for valuables packed in the hold.",
      "ur": "نقدی، زیورات، دستاویزات اور الیکٹرانک اشیاء اپنے پاس رکھیں۔ سامان کے خانے میں رکھی گئی قیمتی اشیاء کی ذمہ داری نیو خان پر نہیں ہوگی۔"
     },
     {
      "en": "Weapons, explosives, flammable or illegal goods are never carried, in luggage or as parcels.",
      "ur": "اسلحہ، دھماکہ خیز مواد، آتش گیر یا غیر قانونی اشیاء کسی صورت نہیں لے جائی جاتیں، نہ سامان میں اور نہ پارسل کے طور پر۔"
     }
    ]
   },
   {
    "h": {
     "en": "Safety on board",
     "ur": "سفر کے دوران حفاظت"
    },
    "list": [
     {
      "en": "Coaches are inspected before long routes, and drivers follow rest rules and speed limits.",
      "ur": "لمبے روٹس سے پہلے کوچز کا معائنہ کیا جاتا ہے، اور ڈرائیور آرام کے اوقات اور رفتار کی حد کی پابندی کرتے ہیں۔"
     },
     {
      "en": "Wear a seat belt where fitted and stay seated while the coach is moving.",
      "ur": "جہاں سیٹ بیلٹ موجود ہو وہاں اسے باندھیں، اور کوچ چلنے کے دوران اپنی سیٹ پر بیٹھے رہیں۔"
     },
     {
      "en": "Smoking, alcohol and drugs are not allowed on board or in the terminals.",
      "ur": "بس میں اور ٹرمینلز پر سگریٹ نوشی، شراب اور منشیات کی اجازت نہیں۔"
     },
     {
      "en": "To report a safety concern, call the helpline at any time.",
      "ur": "حفاظت سے متعلق کسی بھی تشویش کی اطلاع کے لیے کسی بھی وقت ہیلپ لائن پر کال کریں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Children",
     "ur": "بچے"
    },
    "p": [
     {
      "en": "Every child who takes a seat needs a ticket. A child under 3 travelling on an adult's lap travels free. Children under 12 must travel with an adult.",
      "ur": "سیٹ پر بیٹھنے والے ہر بچے کے لیے ٹکٹ ضروری ہے۔ 3 سال سے کم عمر کا بچہ جو کسی بڑے کی گود میں سفر کرے، مفت سفر کرتا ہے۔ 12 سال سے کم عمر بچوں کا کسی بڑے کے ساتھ سفر کرنا ضروری ہے۔"
     }
    ]
   }
  ]
 },
 {
  "id": "privacy",
  "title": {
   "en": "Privacy policy",
   "ur": "رازداری کی پالیسی"
  },
  "summary": {
   "en": "What we collect, why, who sees it, and how to have it corrected or deleted.",
   "ur": "ہم کون سی معلومات جمع کرتے ہیں، کیوں، انہیں کون دیکھتا ہے، اور انہیں درست یا حذف کیسے کروایا جا سکتا ہے۔"
  },
  "sections": [
   {
    "h": {
     "en": "Who we are",
     "ur": "ہم کون ہیں"
    },
    "p": [
     {
      "en": "New Khan, 55 Lawrence Road, Lahore, Punjab, Pakistan. Helpline 0311 1007555 (daily, 8am to midnight), WhatsApp on the same number, email info@newkhan.pk.",
      "ur": "نیو خان، 55 لارنس روڈ، لاہور، پنجاب، پاکستان۔ ہیلپ لائن 0311 1007555 (روزانہ، صبح 8 بجے سے رات 12 بجے تک)، اسی نمبر پر واٹس ایپ، ای میل info@newkhan.pk۔"
     }
    ]
   },
   {
    "h": {
     "en": "What we collect",
     "ur": "ہم کیا معلومات جمع کرتے ہیں"
    },
    "list": [
     {
      "en": "Booking details: passenger names, mobile number, email if you give one, the trips and seats booked, and your CNIC number where the law requires it.",
      "ur": "بکنگ کی تفصیلات: مسافروں کے نام، موبائل نمبر، ای میل (اگر آپ دیں)، بک کیے گئے سفر اور سیٹیں، اور جہاں قانون کا تقاضا ہو وہاں آپ کا شناختی کارڈ نمبر۔"
     },
     {
      "en": "Parcel details: sender and receiver names, numbers and CNIC, and the description and weight of the parcel.",
      "ur": "پارسل کی تفصیلات: بھیجنے والے اور وصول کرنے والے کے نام، فون نمبر اور شناختی کارڈ، اور پارسل کی تفصیل اور وزن۔"
     },
     {
      "en": "Payment records: the amount, date, payment method and a reference from the payment provider. We never see or store your full card number, CVV, PIN or wallet password.",
      "ur": "ادائیگی کا ریکارڈ: رقم، تاریخ، ادائیگی کا طریقہ اور ادائیگی فراہم کنندہ کی طرف سے ریفرنس۔ ہم کبھی آپ کا پورا کارڈ نمبر، CVV، PIN یا والیٹ کا پاس ورڈ نہ دیکھتے ہیں اور نہ محفوظ کرتے ہیں۔"
     },
     {
      "en": "Messages you send us on WhatsApp, by email or through forms on this website.",
      "ur": "وہ پیغامات جو آپ ہمیں واٹس ایپ، ای میل یا اس ویب سائٹ کے فارمز کے ذریعے بھیجتے ہیں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Why we use it",
     "ur": "ہم یہ معلومات کیوں استعمال کرتے ہیں"
    },
    "list": [
     {
      "en": "To issue and check tickets, consignment numbers and charters.",
      "ur": "ٹکٹ، کنسائنمنٹ نمبر اور چارٹر جاری کرنے اور ان کی جانچ کے لیے۔"
     },
     {
      "en": "To tell you about your trip, including delays and changes.",
      "ur": "آپ کو آپ کے سفر کے بارے میں آگاہ کرنے کے لیے، بشمول تاخیر اور تبدیلیاں۔"
     },
     {
      "en": "To take payments, give refunds and keep accounts.",
      "ur": "ادائیگیاں وصول کرنے، ریفنڈ دینے اور حسابات رکھنے کے لیے۔"
     },
     {
      "en": "To meet legal and safety requirements, such as passenger lists that authorities may ask for.",
      "ur": "قانونی اور حفاظتی تقاضے پورے کرنے کے لیے، جیسے مسافروں کی فہرستیں جو متعلقہ حکام طلب کر سکتے ہیں۔"
     }
    ],
    "p": [
     {
      "en": "We do not sell your information, and we do not use it for third-party advertising.",
      "ur": "ہم آپ کی معلومات فروخت نہیں کرتے، اور نہ ہی انہیں کسی دوسری کمپنی کی تشہیر کے لیے استعمال کرتے ہیں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Payments",
     "ur": "ادائیگیاں"
    },
    "p": [
     {
      "en": "Online payments are processed by licensed payment providers such as PayFast, under their own security standards (including PCI DSS for cards). Your card or wallet details are entered on the provider's secure page and go directly to them.",
      "ur": "آن لائن ادائیگیاں PayFast جیسے لائسنس یافتہ ادائیگی فراہم کنندگان کے ذریعے، ان کے اپنے حفاظتی معیارات کے تحت (کارڈز کے لیے PCI DSS سمیت) پراسیس کی جاتی ہیں۔ آپ کے کارڈ یا والیٹ کی تفصیلات فراہم کنندہ کے محفوظ صفحے پر درج کی جاتی ہیں اور براہ راست انہی کے پاس جاتی ہیں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Who we share it with",
     "ur": "ہم یہ معلومات کس کے ساتھ شیئر کرتے ہیں"
    },
    "list": [
     {
      "en": "The payment provider handling your payment or refund.",
      "ur": "وہ ادائیگی فراہم کنندہ جو آپ کی ادائیگی یا ریفنڈ کا عمل مکمل کرتا ہے۔"
     },
     {
      "en": "Messaging services we use to send your ticket (SMS, WhatsApp, email).",
      "ur": "پیغام رسانی کی وہ سروسز جن کے ذریعے ہم آپ کا ٹکٹ بھیجتے ہیں (SMS، واٹس ایپ، ای میل)۔"
     },
     {
      "en": "Government authorities, when the law requires it.",
      "ur": "سرکاری ادارے، جب قانون اس کا تقاضا کرے۔"
     }
    ]
   },
   {
    "h": {
     "en": "How long we keep it, and keeping it safe",
     "ur": "ہم معلومات کب تک رکھتے ہیں اور انہیں کیسے محفوظ رکھتے ہیں"
    },
    "p": [
     {
      "en": "Booking and payment records are kept for as long as accounting and tax law requires, usually up to 6 years, then deleted. Access is limited to staff who need it, and this website is served only over secure HTTPS.",
      "ur": "بکنگ اور ادائیگی کا ریکارڈ اس وقت تک رکھا جاتا ہے جب تک حسابات اور ٹیکس کے قانون کا تقاضا ہو، عام طور پر 6 سال تک، اور پھر حذف کر دیا جاتا ہے۔ اس تک رسائی صرف عملے کے انہی افراد کو ہے جنہیں اس کی ضرورت ہو، اور یہ ویب سائٹ صرف محفوظ HTTPS کے ذریعے چلتی ہے۔"
     }
    ]
   },
   {
    "h": {
     "en": "Cookies",
     "ur": "کوکیز"
    },
    "p": [
     {
      "en": "This website uses only what it needs to work, such as remembering your booking while you complete it. It does not use advertising or tracking cookies.",
      "ur": "یہ ویب سائٹ صرف وہی چیزیں استعمال کرتی ہے جو اس کے چلنے کے لیے ضروری ہیں، جیسے بکنگ مکمل کرتے وقت آپ کی بکنگ یاد رکھنا۔ یہ اشتہاری یا ٹریکنگ کوکیز استعمال نہیں کرتی۔"
     }
    ]
   },
   {
    "h": {
     "en": "Your choices",
     "ur": "آپ کے اختیارات"
    },
    "p": [
     {
      "en": "You can ask to see the information we hold about you, have it corrected, or have it deleted where the law allows. Contact us using the details above. We may change this policy; the date at the top shows the latest version.",
      "ur": "آپ ہم سے اپنے بارے میں محفوظ معلومات دیکھنے، انہیں درست کروانے، یا جہاں قانون اجازت دے وہاں حذف کروانے کی درخواست کر سکتے ہیں۔ اس کے لیے اوپر دی گئی تفصیلات پر ہم سے رابطہ کریں۔ ہم اس پالیسی میں تبدیلی کر سکتے ہیں۔ اوپر درج تاریخ تازہ ترین ورژن ظاہر کرتی ہے۔"
     }
    ]
   }
  ]
 },
 {
  "id": "terms",
  "title": {
   "en": "Terms and conditions",
   "ur": "شرائط و ضوابط"
  },
  "summary": {
   "en": "The agreement between you and New Khan when you book a seat, a charter or a parcel.",
   "ur": "سیٹ، چارٹر یا پارسل بک کرتے وقت آپ اور نیو خان کے درمیان معاہدہ۔"
  },
  "sections": [
   {
    "h": {
     "en": "About these terms",
     "ur": "ان شرائط کے بارے میں"
    },
    "p": [
     {
      "en": "These terms form the agreement between you and New Khan for every seat, charter and parcel booked with us, online, on WhatsApp, by phone or at a counter. By booking you accept them, together with our Refund and cancellation policy, Service delivery policy, travel rules and Privacy policy.",
      "ur": "یہ شرائط ہمارے ساتھ بک کی گئی ہر سیٹ، چارٹر اور پارسل کے لیے آپ اور نیو خان کے درمیان معاہدہ ہیں، چاہے بکنگ آن لائن ہو، واٹس ایپ پر، فون پر یا کاؤنٹر پر۔ بکنگ کر کے آپ ان شرائط کو ہماری ریفنڈ اور منسوخی کی پالیسی، سروس کی فراہمی کی پالیسی، سفر کے اصولوں اور رازداری کی پالیسی سمیت قبول کرتے ہیں۔"
     },
     {
      "en": "New Khan, 55 Lawrence Road, Lahore, Punjab, Pakistan. Helpline 0311 1007555 (daily, 8am to midnight), WhatsApp on the same number, email info@newkhan.pk.",
      "ur": "نیو خان، 55 لارنس روڈ، لاہور، پنجاب، پاکستان۔ ہیلپ لائن 0311 1007555 (روزانہ، صبح 8 بجے سے رات 12 بجے تک)، اسی نمبر پر واٹس ایپ، ای میل info@newkhan.pk۔"
     }
    ]
   },
   {
    "h": {
     "en": "Booking and payment",
     "ur": "بکنگ اور ادائیگی"
    },
    "list": [
     {
      "en": "All prices are in Pakistani rupees (PKR) and include applicable taxes. You pay the fare shown at checkout.",
      "ur": "تمام قیمتیں پاکستانی روپے (PKR) میں ہیں اور ان میں قابل اطلاق ٹیکس شامل ہیں۔ آپ وہی کرایہ ادا کرتے ہیں جو چیک آؤٹ پر دکھایا جاتا ہے۔"
     },
     {
      "en": "Online payments can be made by debit or credit card, bank account or mobile wallet through our payment provider. A seat is confirmed only when full payment is received and a ticket number is issued. Unpaid reservations are released automatically.",
      "ur": "آن لائن ادائیگی ہمارے ادائیگی فراہم کنندہ کے ذریعے ڈیبٹ یا کریڈٹ کارڈ، بینک اکاؤنٹ یا موبائل والیٹ سے کی جا سکتی ہے۔ سیٹ صرف اسی وقت کنفرم ہوتی ہے جب پوری ادائیگی موصول ہو جائے اور ٹکٹ نمبر جاری ہو جائے۔ جن بکنگز کی ادائیگی نہ ہو وہ خود بخود منسوخ ہو جاتی ہیں۔"
     },
     {
      "en": "Please check the names, date, departure and seats before paying. You must be 18 or over to book online.",
      "ur": "ادائیگی سے پہلے براہ کرم نام، تاریخ، روانگی اور سیٹیں چیک کر لیں۔ آن لائن بکنگ کے لیے آپ کی عمر کم از کم 18 سال ہونی چاہیے۔"
     }
    ]
   },
   {
    "h": {
     "en": "Your ticket",
     "ur": "آپ کا ٹکٹ"
    },
    "list": [
     {
      "en": "A ticket is valid only for the passenger, date, departure and seat shown on it, and cannot be resold.",
      "ur": "ٹکٹ صرف اسی مسافر، تاریخ، روانگی اور سیٹ کے لیے کارآمد ہے جو اس پر درج ہے، اور اسے آگے فروخت نہیں کیا جا سکتا۔"
     },
     {
      "en": "Carry your ticket number and CNIC (or B-form for children) when you travel, and reach the terminal at least 30 minutes before departure. Seats are not held after the bus leaves.",
      "ur": "سفر کے وقت اپنا ٹکٹ نمبر اور شناختی کارڈ (بچوں کے لیے ب فارم) ساتھ رکھیں، اور روانگی سے کم از کم 30 منٹ پہلے ٹرمینل پہنچیں۔ بس روانہ ہونے کے بعد سیٹیں روکی نہیں جاتیں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Times and changes",
     "ur": "اوقات اور تبدیلیاں"
    },
    "p": [
     {
      "en": "We plan departure and arrival times carefully, but traffic, weather, road closures and other events outside our control can change them. We will tell you of any change we know about in advance. Your rights when we cancel or delay are set out in the Refund and cancellation policy.",
      "ur": "ہم روانگی اور آمد کے اوقات احتیاط سے طے کرتے ہیں، لیکن ٹریفک، موسم، سڑکوں کی بندش اور ہمارے اختیار سے باہر دیگر واقعات کی وجہ سے ان میں تبدیلی ہو سکتی ہے۔ جس تبدیلی کا ہمیں پہلے سے علم ہو، اس کی اطلاع ہم آپ کو دیں گے۔ ہماری طرف سے منسوخی یا تاخیر کی صورت میں آپ کے حقوق ریفنڈ اور منسوخی کی پالیسی میں درج ہیں۔"
     }
    ]
   },
   {
    "h": {
     "en": "Conduct",
     "ur": "رویہ"
    },
    "p": [
     {
      "en": "Staff may refuse travel, without refund, to anyone who is abusive, intoxicated, endangers others, or carries prohibited goods.",
      "ur": "عملہ کسی بھی ایسے شخص کو بغیر ریفنڈ کے سفر سے روک سکتا ہے جو بدتمیزی کرے، نشے میں ہو، دوسروں کی حفاظت کو خطرے میں ڈالے، یا ممنوعہ اشیاء ساتھ رکھے۔"
     }
    ]
   },
   {
    "h": {
     "en": "Parcels",
     "ur": "پارسل"
    },
    "p": [
     {
      "en": "You must describe parcels truthfully and must not send prohibited goods. Unless a higher value is declared and agreed when the parcel is booked, our liability for loss of or damage to a parcel is limited to the carriage charge paid for it. Parcels not collected within 30 days may be disposed of after we try to contact you.",
      "ur": "پارسل کی درست تفصیل بتانا ضروری ہے اور ممنوعہ اشیاء بھیجنے کی اجازت نہیں۔ جب تک پارسل بک کرتے وقت زیادہ مالیت ظاہر کر کے طے نہ کی جائے، پارسل کے گم ہونے یا اسے نقصان پہنچنے کی صورت میں ہماری ذمہ داری اس کے لیے ادا کیے گئے کرایے تک محدود ہے۔ جو پارسل 30 دن کے اندر وصول نہ کیے جائیں، آپ سے رابطے کی کوشش کے بعد انہیں ٹھکانے لگایا جا سکتا ہے۔"
     }
    ]
   },
   {
    "h": {
     "en": "Our responsibility",
     "ur": "ہماری ذمہ داری"
    },
    "p": [
     {
      "en": "We carry passengers and their belongings with reasonable care. We are not responsible for losses caused by events outside our control, or for valuables packed in the hold. Nothing in these terms limits rights you have under Pakistani consumer law.",
      "ur": "ہم مسافروں اور ان کے سامان کو مناسب احتیاط کے ساتھ لے جاتے ہیں۔ ہمارے اختیار سے باہر واقعات کی وجہ سے ہونے والے نقصان، یا سامان کے خانے میں رکھی گئی قیمتی اشیاء کی ذمہ داری ہم پر نہیں۔ ان شرائط کی کوئی بات پاکستانی صارف قانون کے تحت آپ کے حقوق کو محدود نہیں کرتی۔"
     }
    ]
   },
   {
    "h": {
     "en": "Complaints and law",
     "ur": "شکایات اور قانون"
    },
    "p": [
     {
      "en": "Tell us about any problem on the helpline, on WhatsApp or by email, with your ticket number. We reply within 3 working days. These terms are governed by the laws of Pakistan, and the courts of Lahore have jurisdiction.",
      "ur": "کسی بھی مسئلے کے بارے میں اپنے ٹکٹ نمبر کے ساتھ ہیلپ لائن، واٹس ایپ یا ای میل پر ہمیں بتائیں۔ ہم 3 کاروباری دنوں کے اندر جواب دیتے ہیں۔ یہ شرائط پاکستان کے قوانین کے تابع ہیں، اور ان سے متعلق معاملات لاہور کی عدالتوں کے دائرہ اختیار میں آتے ہیں۔"
     }
    ]
   }
  ]
 }
];

export const legalDoc = (id) => legalDocs.find((d) => d.id === id);

/** The policies as built into the site (the admin panel's "Reset to default" goes back to this). */
export const legalBuiltIn = structuredClone({ updated: legalUpdated, docs: legalDocs });

/** Replaces the policies with the version saved in the admin panel ({ updated, docs }). */
export function applyLegalContent(c) {
  if (!c || typeof c !== "object") return;
  if (c.updated && typeof c.updated === "object") legalUpdated = c.updated;
  if (Array.isArray(c.docs) && c.docs.length) legalDocs = c.docs;
}
