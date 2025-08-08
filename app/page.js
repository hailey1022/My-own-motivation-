"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [moodInput, setMoodInput] = useState("");
  const [quote, setQuote] = useState(null);
  const [imageData, setImageData] = useState(null); // { url, credit }
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setImageLoaded(false);
  }, [imageData?.url]);

  // 초기 진입 시 기본 은하수 배경 호출
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/background?query=${encodeURIComponent("milky way")}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setImageData({ url: data?.url || "", credit: data?.credit || null });
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    if (!moodInput.trim()) return;
    setLoading(true);
    try {
      // 1) GPT로 mood + keywords + topics 받기
      let bestQuery = "dreamy";
      let gptMood = undefined;
      let topics = [];
      try {
        const kwRes = await fetch("/api/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: moodInput }),
        });
        const kwData = await kwRes.json();
        const keywords = Array.isArray(kwData?.keywords) ? kwData.keywords : [];
        bestQuery = keywords[0] || "dreamy";
        if (kwData?.mood) gptMood = kwData.mood;
        if (Array.isArray(kwData?.topics)) topics = kwData.topics;
      } catch (e) {
        console.error("keywords error", e);
      }

      // 2) 외부 명언 API에서 랭킹/번역된 명언 가져오기
      let selected = null;
      try {
        const url = new URL("/api/quotes", window.location.origin);
        if (gptMood) url.searchParams.set("mood", gptMood);
        if (topics?.length) url.searchParams.set("topics", topics.slice(0, 5).join(","));
        const qRes = await fetch(url.toString(), { cache: "no-store" });
        const qList = await qRes.json();
        if (Array.isArray(qList) && qList.length > 0) {
          selected = qList[0];
        }
      } catch (e) {
        console.error("quotes error", e);
      }

      // 3) 폴백: 외부 실패 시 기존 로컬 로직
      if (!selected) {
        const fallback = await fetch("/data/quotes.json", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const list = Array.isArray(fallback?.quotes) ? fallback.quotes : [];
        const idx = Math.floor(Math.random() * (list.length || 1));
        const fb = list[idx] || { text: "오늘을 충실히 사는 것이 내일을 여는 문이다.", author: "익명" };
        selected = { text_ko: fb.text, author: fb.author };
      }

      setQuote({ text: selected.text_ko, author: selected.author, keyword: gptMood || "영감" });

      // 4) 배경 이미지 요청 (GPT 키워드 우선 전달)
      const res = await fetch(
        `/api/background?mood=${encodeURIComponent(gptMood || "영감")}&query=${encodeURIComponent(bestQuery)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setImageData({ url: data?.url || "", credit: data?.credit || null });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // SSR/CSR 일치 보장을 위해, 마운트 전에는 최소 셸만 렌더링
  if (!hasMounted) {
    return <div className="min-h-dvh w-full bg-black" />;
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      {/* 배경: 원본 한 장만 페이드인 */}
      {imageData?.url && (
        <img
          suppressHydrationWarning
          src={imageData.url}
          alt="Background"
          onLoad={() => setImageLoaded(true)}
          className={`pointer-events-none select-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* 어두운 오버레이 */}
      <div className="absolute inset-0 bg-black/45" />

      {/* 중앙 명언 영역 */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center p-6 text-center text-white">
        {quote ? (
          <div className="max-w-3xl px-4">
            <p className="text-pretty text-2xl sm:text-3xl md:text-4xl leading-relaxed md:leading-snug drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
              “{quote.text}”
            </p>
            <p className="mt-4 text-sm sm:text-base text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]">— {quote.author}</p>
          </div>
        ) : (
          <div className="max-w-2xl px-4">
            <h1 className="mb-3 text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight text-gray-300/50">My Own Motivation</h1>
          </div>
        )}
      </div>

      {/* 사진 크레딧 */}
      {imageData?.credit && (
        <div className="pointer-events-auto absolute bottom-16 left-2 z-20 text-[10px] leading-tight text-white/65">
          <a className="hover:underline" href={imageData.credit.imageLink || "#"} rel="noopener noreferrer nofollow" target="_blank">Unsplash</a>
          <span className="px-1">·</span>
          <a className="hover:underline" href={imageData.credit.authorLink || "#"} rel="noopener noreferrer nofollow" target="_blank">{imageData.credit.authorName}</a>
        </div>
      )}

      {/* 하단 입력 바 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-t-xl bg-black/35 backdrop-blur-md p-3 shadow-[0_-6px_24px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <input
                className="w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/60 outline-none focus:border-white/40"
                placeholder="지금 당신의 기분을 알고 싶어요. 당신의 마음을 달래주는 문장을 들려드릴게요."
                value={moodInput}
                onChange={(e) => setMoodInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <button
                type="button"
                aria-label={loading ? "생성 중" : "입력"}
                title={loading ? "생성 중" : "입력"}
                className={`shrink-0 grid place-items-center rounded-md bg-white/90 hover:bg-white disabled:opacity-60 h-12 w-12 text-black ${loading ? "animate-pulse" : ""}`}
                onClick={handleGenerate}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
                <span className="sr-only">입력</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
