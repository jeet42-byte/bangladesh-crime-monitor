/**
 * "What do I do?" - practical steps after a crime, in English and Bangla.
 *
 * General information, not legal advice. Every number here is a national,
 * free, publicly listed line; nothing is a private contact. Keep claims to
 * what holds everywhere in Bangladesh, and send readers to the official
 * service rather than paraphrasing procedure that varies by case.
 */

export type Lang = "en" | "bn";

export interface Helpline {
  number: string;
  label: Record<Lang, string>;
}

export interface Guide {
  id: string;
  title: Record<Lang, string>;
  when: Record<Lang, string>;
  steps: Record<Lang, string[]>;
}

export const HELPLINES: Helpline[] = [
  { number: "999", label: { en: "National emergency: police, fire, ambulance", bn: "জাতীয় জরুরি সেবা: পুলিশ, ফায়ার সার্ভিস, অ্যাম্বুলেন্স" } },
  { number: "109", label: { en: "Violence against women and children", bn: "নারী ও শিশু নির্যাতন প্রতিরোধ" } },
  { number: "1098", label: { en: "Child helpline", bn: "শিশু সহায়তা" } },
  { number: "16430", label: { en: "Free government legal aid", bn: "সরকারি বিনামূল্যে আইনি সহায়তা" } },
  { number: "333", label: { en: "Government information and services", bn: "সরকারি তথ্য ও সেবা" } },
];

export const GUIDES: Guide[] = [
  {
    id: "emergency",
    title: { en: "In danger right now", bn: "এই মুহূর্তে বিপদে" },
    when: { en: "A crime is happening, someone is hurt, or you are being threatened.", bn: "অপরাধ ঘটছে, কেউ আহত, বা আপনাকে হুমকি দেওয়া হচ্ছে।" },
    steps: {
      en: [
        "Call 999. It is free from any phone, including without balance.",
        "Say where you are first: area, road, nearest landmark. Then what is happening.",
        "Move somewhere safe and stay on the line if you can.",
        "Do not confront armed people. Your safety comes before property.",
      ],
      bn: [
        "৯৯৯-এ কল করুন। যেকোনো ফোন থেকে বিনামূল্যে, ব্যালেন্স ছাড়াও করা যায়।",
        "প্রথমে বলুন আপনি কোথায়: এলাকা, রাস্তা, কাছের পরিচিত স্থান। তারপর কী ঘটছে।",
        "নিরাপদ জায়গায় সরে যান এবং সম্ভব হলে লাইনে থাকুন।",
        "অস্ত্রধারীদের মুখোমুখি হবেন না। সম্পদের চেয়ে আপনার জীবন আগে।",
      ],
    },
  },
  {
    id: "gd",
    title: { en: "Lost something or being threatened: file a GD", bn: "কিছু হারিয়েছে বা হুমকি পাচ্ছেন: জিডি করুন" },
    when: { en: "Lost phone, NID, documents; threats; a missing person.", bn: "মোবাইল, এনআইডি, কাগজপত্র হারানো; হুমকি; কেউ নিখোঁজ।" },
    steps: {
      en: [
        "Go to the police station for the area where it happened. A General Diary (GD) is free.",
        "Write what happened, when and where. Bring your NID and any proof (phone IMEI box, receipts).",
        "Keep the copy with the GD number and date. You will need it to replace documents or SIMs.",
        "Many stations also accept GDs online through the police's official channels; ask at the station.",
      ],
      bn: [
        "যেখানে ঘটনা ঘটেছে সেই এলাকার থানায় যান। সাধারণ ডায়েরি (জিডি) করতে কোনো টাকা লাগে না।",
        "কী, কখন, কোথায় ঘটেছে লিখুন। এনআইডি এবং প্রমাণ (মোবাইলের আইএমইআই বক্স, রসিদ) সঙ্গে নিন।",
        "জিডি নম্বর ও তারিখসহ কপি রেখে দিন। কাগজপত্র বা সিম তুলতে এটি লাগবে।",
        "অনেক থানায় পুলিশের অফিসিয়াল মাধ্যমে অনলাইনেও জিডি করা যায়; থানায় জিজ্ঞেস করুন।",
      ],
    },
  },
  {
    id: "fir",
    title: { en: "A crime was committed: file a case (FIR / এজাহার)", bn: "অপরাধ ঘটেছে: মামলা করুন (এজাহার)" },
    when: { en: "Robbery, assault, murder, extortion, drugs, kidnapping and other serious offences.", bn: "ডাকাতি, ছিনতাই, মারধর, হত্যা, চাঁদাবাজি, মাদক, অপহরণ ও অন্যান্য গুরুতর অপরাধ।" },
    steps: {
      en: [
        "Go to the police station for the area where it happened. Filing a case is free; nobody may ask you for money.",
        "Give a written complaint: what happened, date, time, place, who was involved if known, witnesses.",
        "Ask for a copy of the recorded FIR with its case number. Keep it safe.",
        "Get medical treatment first if hurt, and keep the hospital papers: they are evidence.",
      ],
      bn: [
        "যেখানে ঘটনা ঘটেছে সেই এলাকার থানায় যান। মামলা করতে কোনো টাকা লাগে না; কেউ টাকা চাইতে পারবে না।",
        "লিখিত অভিযোগ দিন: কী ঘটেছে, তারিখ, সময়, স্থান, জানা থাকলে কারা জড়িত, সাক্ষী কারা।",
        "মামলা নম্বরসহ এজাহারের কপি চেয়ে নিন এবং সংরক্ষণ করুন।",
        "আহত হলে আগে চিকিৎসা নিন এবং হাসপাতালের কাগজ রাখুন: এগুলো প্রমাণ।",
      ],
    },
  },
  {
    id: "police-refuse",
    title: { en: "If the police will not take your case", bn: "থানা মামলা নিতে না চাইলে" },
    when: { en: "The station refuses, delays, or asks for money.", bn: "থানা মামলা নিতে অস্বীকার করে, দেরি করে, বা টাকা চায়।" },
    steps: {
      en: [
        "Write down the date, time and the officer's name and keep your unaccepted complaint.",
        "Submit the complaint in writing to the senior officer: the Superintendent of Police (district) or the Deputy Commissioner of Police (metropolitan area).",
        "You can also file the complaint directly before a Magistrate's court (a complaint petition, নালিশি মামলা). A lawyer can help; free legal aid is available on 16430.",
      ],
      bn: [
        "তারিখ, সময় ও কর্মকর্তার নাম লিখে রাখুন এবং যে অভিযোগ নেওয়া হয়নি তার কপি রাখুন।",
        "ঊর্ধ্বতন কর্মকর্তার কাছে লিখিত অভিযোগ দিন: জেলায় পুলিশ সুপার (এসপি), মহানগরে উপ-পুলিশ কমিশনার (ডিসি)।",
        "সরাসরি ম্যাজিস্ট্রেট আদালতেও নালিশি মামলা করতে পারেন। আইনজীবী সাহায্য করতে পারেন; ১৬৪৩০-এ বিনামূল্যে আইনি সহায়তা পাওয়া যায়।",
      ],
    },
  },
  {
    id: "women-children",
    title: { en: "Sexual violence, domestic abuse, trafficking", bn: "যৌন সহিংসতা, পারিবারিক নির্যাতন, পাচার" },
    when: { en: "You or someone you know is a survivor, or a child is at risk.", bn: "আপনি বা পরিচিত কেউ ভুক্তভোগী, বা কোনো শিশু ঝুঁকিতে।" },
    steps: {
      en: [
        "Call 109 (women and children) or 1098 (children) for free advice and referral, any time.",
        "Go to a One-Stop Crisis Centre (OCC) at a government medical college hospital: medical care, police help, legal and counselling support in one place.",
        "Seek medical examination as soon as possible and do not wash or discard clothing first: it preserves evidence.",
        "A case can be filed at the police station; if it is not taken, the Nari-o-Shishu Nirjatan Daman Tribunal can receive the complaint directly.",
      ],
      bn: [
        "যেকোনো সময় বিনামূল্যে পরামর্শ ও সহায়তার জন্য ১০৯ (নারী ও শিশু) বা ১০৯৮ (শিশু) নম্বরে কল করুন।",
        "সরকারি মেডিকেল কলেজ হাসপাতালের ওয়ান-স্টপ ক্রাইসিস সেন্টারে (ওসিসি) যান: চিকিৎসা, পুলিশি সহায়তা, আইনি ও মানসিক সহায়তা এক জায়গায়।",
        "যত দ্রুত সম্ভব মেডিকেল পরীক্ষা করান এবং আগে গোসল করবেন না বা কাপড় ফেলবেন না: এতে প্রমাণ থাকে।",
        "থানায় মামলা করা যায়; থানা না নিলে নারী ও শিশু নির্যাতন দমন ট্রাইব্যুনালে সরাসরি অভিযোগ করা যায়।",
      ],
    },
  },
  {
    id: "cyber",
    title: { en: "Online harassment, hacking, sextortion", bn: "অনলাইন হয়রানি, হ্যাকিং, ব্ল্যাকমেইল" },
    when: { en: "Someone threatens to share images, hacks your account, or harasses you online.", bn: "কেউ ছবি ছড়ানোর হুমকি দেয়, অ্যাকাউন্ট হ্যাক করে, বা অনলাইনে হয়রানি করে।" },
    steps: {
      en: [
        "Do not pay and do not negotiate. Payment almost never ends blackmail.",
        "Save evidence before blocking: screenshots showing the profile link, messages with dates, phone numbers, transaction IDs.",
        "Women can report to Police Cyber Support for Women (PCSW) through its official Facebook page.",
        "File a GD or case at your police station with the evidence; serious cases go to the police cyber crime units.",
        "Report the account to the platform and secure yours: change passwords, turn on two-step verification.",
      ],
      bn: [
        "টাকা দেবেন না, দর-কষাকষি করবেন না। টাকা দিলে ব্ল্যাকমেইল প্রায় কখনো থামে না।",
        "ব্লক করার আগে প্রমাণ রাখুন: প্রোফাইল লিংকসহ স্ক্রিনশট, তারিখসহ মেসেজ, ফোন নম্বর, লেনদেনের আইডি।",
        "নারীরা পুলিশ সাইবার সাপোর্ট ফর উইমেন (পিসিএসডব্লিউ)-এর অফিসিয়াল ফেসবুক পেজে অভিযোগ করতে পারেন।",
        "প্রমাণসহ থানায় জিডি বা মামলা করুন; গুরুতর ঘটনা পুলিশের সাইবার ক্রাইম ইউনিটে যায়।",
        "প্ল্যাটফর্মে অ্যাকাউন্টটি রিপোর্ট করুন এবং নিজের অ্যাকাউন্ট সুরক্ষিত করুন: পাসওয়ার্ড বদলান, টু-স্টেপ ভেরিফিকেশন চালু করুন।",
      ],
    },
  },
  {
    id: "mobile-money",
    title: { en: "Mobile money or bank fraud", bn: "মোবাইল ব্যাংকিং বা ব্যাংক প্রতারণা" },
    when: { en: "Money taken through bKash, Nagad, a card, or a fake 'agent' call.", bn: "বিকাশ, নগদ, কার্ড, বা ভুয়া 'এজেন্ট' কলের মাধ্যমে টাকা নেওয়া হয়েছে।" },
    steps: {
      en: [
        "Call your provider at once so they can try to hold the money: bKash 16247, Nagad 16167, or your bank's hotline.",
        "Never share a PIN or OTP. No genuine agent, bank or company will ask for it.",
        "Note the number that called, the transaction ID and the time, then file a GD or case at the police station.",
      ],
      bn: [
        "সঙ্গে সঙ্গে প্রতিষ্ঠানকে কল করুন যাতে টাকা আটকানোর চেষ্টা করা যায়: বিকাশ ১৬২৪৭, নগদ ১৬১৬৭, বা আপনার ব্যাংকের হটলাইন।",
        "কখনো পিন বা ওটিপি দেবেন না। কোনো আসল এজেন্ট, ব্যাংক বা প্রতিষ্ঠান এটি চায় না।",
        "যে নম্বর থেকে কল এসেছে, লেনদেনের আইডি ও সময় লিখে রাখুন, তারপর থানায় জিডি বা মামলা করুন।",
      ],
    },
  },
  {
    id: "mob",
    title: { en: "A crowd is about to punish someone", bn: "জনতা কাউকে শাস্তি দিতে যাচ্ছে" },
    when: { en: "A suspected thief, 'kidnapper' or blasphemer is caught by a crowd.", bn: "সন্দেহভাজন চোর, 'ছেলেধরা' বা অন্য কাউকে জনতা আটক করেছে।" },
    steps: {
      en: [
        "Call 999 immediately and give the exact location.",
        "Do not join in and do not film for social media: rumours spread fast and have killed innocent people.",
        "Beating or killing a suspect is itself a crime. Only a court can punish; hand the person to the police.",
      ],
      bn: [
        "সঙ্গে সঙ্গে ৯৯৯-এ কল করে সঠিক অবস্থান জানান।",
        "যোগ দেবেন না এবং সামাজিক মাধ্যমের জন্য ভিডিও করবেন না: গুজব দ্রুত ছড়ায় এবং নিরপরাধ মানুষের মৃত্যু ঘটিয়েছে।",
        "সন্দেহভাজনকে মারধর বা হত্যা করা নিজেই অপরাধ। শাস্তি দিতে পারে শুধু আদালত; ব্যক্তিকে পুলিশের হাতে দিন।",
      ],
    },
  },
  {
    id: "legal-aid",
    title: { en: "Free legal help", bn: "বিনামূল্যে আইনি সহায়তা" },
    when: { en: "You cannot afford a lawyer, or do not know what to do next.", bn: "আইনজীবীর খরচ দিতে পারছেন না, বা পরবর্তী করণীয় জানেন না।" },
    steps: {
      en: [
        "Call the National Legal Aid helpline 16430 (free) for advice and a referral.",
        "Every district has a legal aid office at the district judge's court that can appoint a lawyer for people who qualify.",
        "Bring your GD or case copy, NID and any documents when you go.",
      ],
      bn: [
        "পরামর্শ ও সহায়তার জন্য জাতীয় আইনগত সহায়তা হেল্পলাইন ১৬৪৩০-এ (বিনামূল্যে) কল করুন।",
        "প্রতিটি জেলায় জেলা জজ আদালতে লিগ্যাল এইড অফিস আছে, যোগ্যদের জন্য আইনজীবী নিয়োগ দিতে পারে।",
        "যাওয়ার সময় জিডি বা মামলার কপি, এনআইডি ও কাগজপত্র সঙ্গে নিন।",
      ],
    },
  },
];

/** Which guide fits a crime category best, for "what to do" links. */
export function guideFor(category: string): string {
  switch (category) {
    case "Sexual Violence":
    case "Domestic Violence":
    case "Human Trafficking":
      return "women-children";
    case "Cybercrime":
      return "cyber";
    case "Fraud":
      return "mobile-money";
    case "Theft":
      return "gd";
    default:
      return "fir";
  }
}

const LANG_KEY = "bcm.lang";

export function loadLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}
