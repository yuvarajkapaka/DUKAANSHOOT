"use client";
import type { GarmentType, LookOptions } from "../types";

/* ------------------------------------------------------------- recognition */
type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const voiceSupported = () => !!recognitionCtor();

const LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

/** Listen once. Resolves with what was said ("" if nothing). */
export function listenOnce(locale: string, timeoutMs = 8000): { promise: Promise<string>; stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { promise: Promise.reject(new Error("UNSUPPORTED")), stop: () => {} };
  const rec = new Ctor();
  rec.lang = LANG[locale] ?? "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let timer: ReturnType<typeof setTimeout>;
  const promise = new Promise<string>((resolve, reject) => {
    let text = "";
    rec.onresult = (e) => {
      const alts = e.results[0];
      text = Array.from({ length: alts.length }, (_, i) => alts[i].transcript).join(" | ");
    };
    rec.onerror = (e) => (e.error === "no-speech" || e.error === "aborted" ? resolve("") : reject(new Error(e.error)));
    rec.onend = () => {
      clearTimeout(timer);
      resolve(text);
    };
    rec.start();
    timer = setTimeout(() => rec.stop(), timeoutMs);
  });
  return { promise, stop: () => rec.stop() };
}

/* ------------------------------------------------------------------ parser */
// keywords in English, Hindi (Devanagari + common romanised) and Telugu
const RULES: { words: string[]; apply: Partial<LookOptions> & { garment?: GarmentType } }[] = [
  { words: ["woman", "lady", "female", "aunty", "महिला", "औरत", "लेडी", "aurat", "mahila", "మహిళ", "ఆడ", "స్త్రీ", "అమ్మాయి పెద్ద"], apply: { gender: "woman" } },
  { words: ["man", "male", "gents", "पुरुष", "आदमी", "aadmi", "purush", "పురుషుడు", "మగ", "అబ్బాయి పెద్ద"], apply: { gender: "man" } },
  { words: ["girl", "daughter", "लड़की", "बच्ची", "ladki", "అమ్మాయి", "పాప"], apply: { gender: "girl" } },
  { words: ["boy", "son", "kid", "लड़का", "बच्चा", "ladka", "అబ్బాయి", "బాబు"], apply: { gender: "boy" } },
  { words: ["young", "college", "युवा", "जवान", "యువ"], apply: { age: "young" } },
  { words: ["senior", "old", "elder", "बुज़ुर्ग", "बुजुर्ग", "వృద్ధ", "పెద్దవారు"], apply: { age: "senior" } },
  { words: ["fair", "gora", "गोरा", "गोरी", "తెల్ల"], apply: { skin: "light" } },
  { words: ["wheatish", "गेहुँआ", "గోధుమ"], apply: { skin: "wheatish" } },
  { words: ["dusky", "dark", "saanwla", "सांवला", "साँवला", "चामन", "నల్ల", "చామన"], apply: { skin: "dusky" } },
  { words: ["close", "closeup", "क्लोज़", "क्लोज", "దగ్గర"], apply: { pose: "closeup" } },
  { words: ["side", "साइड", "పక్క"], apply: { pose: "side" } },
  { words: ["hip", "waist", "कमर", "నడుము"], apply: { pose: "hip" } },
  { words: ["standing", "stand", "खड़े", "खड़ी", "నిలబడి"], apply: { pose: "standing" } },
  { words: ["wedding", "marriage", "temple", "bridal", "shaadi", "शादी", "मंदिर", "दुल्हन", "పెళ్లి", "పెళ్ళి", "గుడి", "దేవాలయ"], apply: { background: "wedding" } },
  { words: ["diwali", "festival", "festive", "sankranti", "pongal", "दिवाली", "त्योहार", "त्यौहार", "పండుగ", "దీపావళి", "సంక్రాంతి"], apply: { background: "festive" } },
  { words: ["street", "outdoor", "outside", "road", "बाहर", "सड़क", "బయట", "వీధి", "రోడ్"], apply: { background: "street" } },
  { words: ["white", "plain", "amazon", "meesho", "flipkart", "सफ़ेद", "सफेद", "తెలుపు", "తెల్లని"], apply: { background: "white" } },
  { words: ["studio", "grey", "gray", "स्टूडियो", "స్టూడియో"], apply: { background: "studio" } },
  { words: ["shop", "store", "dukaan", "दुकान", "షాప్", "దుకాణం"], apply: { background: "shop" } },
  { words: ["saree", "sari", "साड़ी", "साडी", "చీర"], apply: { garment: "saree" } },
  { words: ["lehenga", "लहंगा", "లెహంగా"], apply: { garment: "lehenga" } },
  { words: ["kurta", "kurti", "कुर्ता", "कुर्ती", "కుర్తా", "కుర్తీ"], apply: { garment: "kurta" } },
  { words: ["t-shirt", "tshirt", "टी-शर्ट", "टीशर्ट", "టీ షర్ట్"], apply: { garment: "tshirt" } },
  { words: ["shirt", "शर्ट", "కమీజ్", "చొక్కా", "షర్ట్"], apply: { garment: "shirt" } },
  { words: ["frock", "dress", "फ्रॉक", "ड्रेस", "ఫ్రాక్", "డ్రెస్"], apply: { garment: "dress" } },
  { words: ["pant", "pants", "jeans", "trouser", "पैंट", "ప్యాంట్"], apply: { garment: "pants" } },
];

export function parseVoice(text: string): (Partial<LookOptions> & { garment?: GarmentType }) | null {
  const t = ` ${text.toLowerCase()} `;
  const out: Partial<LookOptions> & { garment?: GarmentType } = {};
  for (const rule of RULES) {
    // longer, more specific words win when two rules overlap (e.g. "t-shirt" vs "shirt")
    if (rule.words.some((w) => (/^[a-z-]+$/.test(w) ? new RegExp(`[^a-z]${w.replace("-", "\\-")}[^a-z]`).test(t) : t.includes(w)))) {
      for (const [k, v] of Object.entries(rule.apply)) {
        if ((out as Record<string, unknown>)[k] === undefined) (out as Record<string, unknown>)[k] = v;
      }
    }
  }
  return Object.keys(out).length ? out : null;
}
