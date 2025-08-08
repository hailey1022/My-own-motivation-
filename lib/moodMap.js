export function normalizeKorean(text) {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "");
}

// 입력 감정을 대표 키워드로 매핑
export function mapMoodToKeyword(input) {
  const t = normalizeKorean(input);
  const rules = [
    { kw: "슬픔", matchers: ["슬프", "우울", "힘들", "눈물", "외롭", "쓸쓸", "허무", "상실"] },
    { kw: "기쁨", matchers: ["기쁨", "기뻐", "행복", "설렘", "신남", "즐거움", "환희"] },
    { kw: "불안", matchers: ["불안", "초조", "걱정", "두려움", "공포", "긴장"] },
    { kw: "분노", matchers: ["분노", "화남", "짜증", "억울", "격앙"] },
    { kw: "평온", matchers: ["평온", "고요", "차분", "안정", "명상", "휴식", "평화"] },
    { kw: "사랑", matchers: ["사랑", "연애", "그리움", "연결", "마음", "사무침"] },
    { kw: "희망", matchers: ["희망", "용기", "도전", "의지", "미래", "빛", "긍정"] },
    { kw: "성장", matchers: ["성장", "꾸준", "인내", "노력", "발전", "학습", "습관"] },
    { kw: "감사", matchers: ["감사", "고마움", "충만", "은혜"] },
    { kw: "창의", matchers: ["창의", "영감", "아이디어", "상상", "창조"] }
  ];

  for (const { kw, matchers } of rules) {
    if (matchers.some((m) => t.includes(m))) return kw;
  }
  return "영감"; // 기본값
}

// Unsplash 쿼리 후보를 감정 키워드에 매핑
export function mapKeywordToUnsplashQueries(keyword) {
  const table = {
    슬픔: ["moody sky", "rain night", "misty forest", "lonely road", "blue ocean", "noir city"],
    기쁨: ["sunrise", "golden hour", "colorful aurora", "spring blossoms", "bokeh lights", "rainbow"],
    불안: ["storm clouds", "night city neon", "foggy", "abstract shadows", "waves at night", "eerie"],
    분노: ["thunderstorm", "volcanic", "crimson sky", "wild ocean"],
    평온: ["calm ocean", "aurora borealis", "quiet lake", "milky way", "zen garden", "soft mist"],
    사랑: ["romantic sky", "soft pastel clouds", "stardust", "warm sunset", "pink aurora", "tender"],
    희망: ["dawn light", "rising sun", "starry sky", "northern lights", "new beginnings", "light rays"],
    성장: ["mountain path", "forest trail light", "sprout macro", "climb", "dreamy hills", "steps"],
    감사: ["golden field", "warm light", "harvest", "sunbeam"],
    창의: ["surreal", "dreamscape", "ethereal", "nebula", "cosmic art"],
    영감: ["dreamy", "space nebula", "galaxy", "cosmic", "ocean night", "aurora"]
  };
  return table[keyword] ?? table["영감"];
}

export function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

