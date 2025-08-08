const ALLOWED_MOODS = [
  "슬픔",
  "기쁨",
  "불안",
  "분노",
  "평온",
  "사랑",
  "희망",
  "성장",
  "감사",
  "창의",
  "영감",
];

function moodToEnglishKeywords(mood) {
  const table = {
    슬픔: ["sad", "sorrow", "grief", "melancholy", "lonely"],
    기쁨: ["joy", "happiness", "delight", "cheer", "smile"],
    불안: ["anxiety", "uneasy", "worry", "fear", "nervous"],
    분노: ["anger", "rage", "fury", "wrath"],
    평온: ["calm", "peace", "serene", "quiet", "tranquil"],
    사랑: ["love", "affection", "beloved", "romance"],
    희망: ["hope", "optimism", "light", "future"],
    성장: ["growth", "persevere", "learn", "progress"],
    감사: ["gratitude", "thankful", "appreciation"],
    창의: ["creative", "imagination", "inspire", "invent"],
    영감: ["inspiration", "insight", "spark"],
  };
  return table[mood] ?? [];
}

async function fetchQuotable() {
  try {
    const url = new URL("https://api.quotable.io/quotes");
    url.searchParams.set("limit", "40");
    url.searchParams.set("tags", "inspirational|life|happiness|wisdom");
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("quotable error");
    const data = await res.json();
    return (data?.results || []).map((q) => ({
      text_en: q.content,
      author: q.author,
      tags_en: Array.isArray(q.tags) ? q.tags : [],
      source: "quotable",
    }));
  } catch {
    return [];
  }
}

async function fetchZenQuotes() {
  try {
    const res = await fetch("https://zenquotes.io/api/quotes", { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("zenquotes error");
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((q) => ({
      text_en: q.q,
      author: q.a,
      tags_en: [],
      source: "zenquotes",
    }));
  } catch {
    return [];
  }
}

function scoreQuote(item, mood, topics) {
  const moodKeywords = new Set(moodToEnglishKeywords(mood).map((s) => s.toLowerCase()));
  const topicTokens = new Set((topics || []).map((s) => String(s).toLowerCase()));
  const text = String(item.text_en || "").toLowerCase();
  const author = String(item.author || "").toLowerCase();
  const tags = (item.tags_en || []).map((t) => String(t).toLowerCase());

  let score = 0;
  // mood keywords present in text/tags
  for (const mk of moodKeywords) {
    if (mk && (text.includes(mk) || tags.some((t) => t.includes(mk)))) score += 2;
  }
  // topics present in text
  for (const tk of topicTokens) {
    if (tk && text.includes(tk)) score += 1.5;
  }
  // sentiment mismatch penalties to reduce off-tone picks
  if (mood === "슬픔" && /(joy|happy|smile|delight)/.test(text)) score -= 0.8;
  if (mood === "기쁨" && /(sad|sorrow|grief|lonely)/.test(text)) score -= 0.8;
  // generic bonus for inspirational/wisdom style tags
  if (tags.some((t) => /inspir|wisdom|happi|life/.test(t))) score += 1;
  // small randomization for diversity
  score += Math.random() * 0.3;
  return score;
}

async function translateWithOpenAI(quotes) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return quotes.map((q) => ({ ...q, text_ko: q.text_en }));
  }

  // Only translate top N to control cost
  const texts = quotes.map((q) => q.text_en);
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "당신은 번역가입니다. 입력 배열의 각 영어 명언을 자연스러운 한국어 문장으로 번역합니다. 존댓말/구어체 금지, 간결한 문어체 유지, 이모지/괄호/주석 금지. 오직 JSON 객체만 반환하세요.",
      },
      {
        role: "user",
        content:
          `다음 영어 문장 배열을 한국어로 번역해 같은 순서의 배열로 돌려주세요. 반드시 아래 형태의 JSON만 반환하세요.\n{ "translations": ["문장1", "문장2", ...] }\n입력 배열: ${JSON.stringify(
            texts
          )}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("openai translation error");
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    }
    const arr = Array.isArray(parsed?.translations) ? parsed.translations : [];
    return quotes.map((q, i) => ({ ...q, text_ko: arr[i] || q.text_en }));
  } catch {
    return quotes.map((q) => ({ ...q, text_ko: q.text_en }));
  }
}

async function translateOneWithOpenAI(textEn) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return textEn;
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "영어 문장을 자연스러운 한국어 한 문장으로 번역하세요. 존댓말/구어체 금지, 간결한 문어체. 오직 JSON 객체로만 답하십시오.",
      },
      {
        role: "user",
        content: `이 문장을 번역하세요. { "text": ${JSON.stringify(textEn)} }\n반드시 { "translation": "..." } 형식으로만 반환`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("openai one translation error");
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    let parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    }
    return parsed?.translation || textEn;
  } catch {
    return textEn;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get("mood") || "영감";
  const topicsParam = searchParams.get("topics") || "";
  const topics = topicsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  const results = await Promise.all([fetchQuotable(), fetchZenQuotes()]);
  let pool = results.flat().filter((q) => q?.text_en && q?.author);

  // Deduplicate by text
  const seen = new Set();
  pool = pool.filter((q) => {
    const key = (q.text_en + "::" + q.author).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Rank by mood/topics
  pool.sort((a, b) => scoreQuote(b, mood, topics) - scoreQuote(a, mood, topics));

  // Ensure top-1 is translated reliably to Korean
  const best = pool[0];
  if (!best) return Response.json([], { status: 200 });
  let text_ko = best.text_en;
  try {
    text_ko = await translateOneWithOpenAI(best.text_en);
  } catch {}

  return Response.json(
    [
      {
        text_ko,
        text_en: best.text_en,
        author: best.author,
        tags: best.tags_en,
        source: best.source,
      },
    ],
    { status: 200 }
  );
}


