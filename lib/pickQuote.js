import { mapMoodToKeyword } from "@/lib/moodMap";

async function loadQuotes() {
  try {
    const res = await fetch("/data/quotes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load quotes");
    const data = await res.json();
    return Array.isArray(data?.quotes) ? data.quotes : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function getRelatedTags(primaryMood) {
  const table = {
    슬픔: ["치유", "희망", "평온", "내면"],
    기쁨: ["희망", "사랑", "빛"],
    불안: ["용기", "희망", "평온"],
    분노: ["이해", "평온", "용기"],
    평온: ["명상", "휴식", "성찰"],
    사랑: ["연결", "그리움", "빛"],
    희망: ["용기", "회복", "빛"],
    성장: ["꾸준함", "인내", "회복"],
    감사: ["충만", "평온"],
    창의: ["영감", "아이디어"],
    영감: ["창의", "희망", "성장", "평온", "빛"],
  };
  return table[primaryMood] ?? [];
}

export async function pickQuoteByMood(inputMood, overrideMood) {
  const base = mapMoodToKeyword(inputMood);
  const mood = overrideMood || base;
  const quotes = await loadQuotes();
  if (quotes.length === 0) return { text: "명언 데이터를 불러오지 못했습니다.", author: "시스템", keyword: mood };

  const hasTag = (q, tag) => Array.isArray(q.tags) && q.tags.some((t) => String(t).includes(tag));
  const filtered = quotes.filter((q) => hasTag(q, mood));

  let pool = filtered;
  if (pool.length < 3) {
    const related = getRelatedTags(mood);
    const broadened = quotes.filter((q) => related.some((t) => hasTag(q, t)));
    pool = [...new Set([...(pool || []), ...broadened])];
  }
  if (pool.length === 0) pool = quotes;

  const idx = Math.floor(Math.random() * pool.length);
  const { text, author } = pool[idx];
  return { text, author, keyword: mood };
}

