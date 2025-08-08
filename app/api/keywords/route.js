export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // 키가 없으면 간단한 휴리스틱(키워드 + 대표 감정) 반환
      return Response.json({
        keywords: ["dreamy", "aurora", "ocean", "nebula"],
        topics: ["꿈", "바다"],
        mood: "영감",
        source: "fallback",
      });
    }

    const allowed = [
      "슬픔","기쁨","불안","분노","평온","사랑","희망","성장","감사","창의","영감"
    ];
    const prompt = `다음 사용자의 문장에서\n1) 대표 감정(mood)을 아래 후보 중 하나로 고르고,\n2) 세부 토픽(topics) 2~5개(한국어/영어 단어 위주),\n3) 이미지 검색용 영어 키워드(keywords) 3~5개를 추출해 JSON으로 반환하세요.\n- 감정 후보: ${allowed.join(", ")}\n- 반드시 이 형식의 JSON 하나만 반환: {\"mood\":\"<감정>\",\"topics\":["..."],\"keywords\":["..."]}\n문장: ${text}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Always respond with ONLY one JSON object with fields: mood (one of given Korean labels), topics (2-5 short nouns/phrases), and keywords (3-5 short English search keywords).",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI error: ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 매우 단순한 보정: 코드블록 제거
      const cleaned = content.replace(/^```(?:json)?/i, "").replace(/```$/, "");
      try { parsed = JSON.parse(cleaned); } catch {}
    }

    let mood = parsed?.mood;
    let keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : [];
    let topics = Array.isArray(parsed?.topics) ? parsed.topics : [];
    if (!mood || !allowed.includes(mood)) mood = "영감";
    if (keywords.length === 0) keywords = ["dreamy", "cosmic", "aurora"];

    return Response.json({ keywords, topics, mood, source: "openai" }, { status: 200 });
  } catch (e) {
    return Response.json({ keywords: ["dreamy", "galaxy", "ocean"], topics: ["꿈"], mood: "영감", source: "error" }, { status: 200 });
  }
}


