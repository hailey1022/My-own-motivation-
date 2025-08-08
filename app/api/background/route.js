import { mapKeywordToUnsplashQueries, mapMoodToKeyword, pickRandom } from "@/lib/moodMap";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const moodInput = searchParams.get("mood") || "";
  const queryFromClient = searchParams.get("query"); // GPT가 생성한 키워드 우선
  const keyword = mapMoodToKeyword(moodInput);
  const queries = mapKeywordToUnsplashQueries(keyword);
  const query = queryFromClient || pickRandom(queries);

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  // 2) Unsplash API 또는 3) source.unsplash.com 폴백
  // 키가 없으면 source.unsplash.com로 대체(키 불필요)
  if (!accessKey) {
    const url = `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
    return Response.json({ url, source: "unsplash-source", keyword, query, credit: null }, { status: 200 });
  }

  try {
    const endpoint = new URL("https://api.unsplash.com/photos/random");
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("orientation", "landscape");
    endpoint.searchParams.set("content_filter", "high");

    const res = await fetch(endpoint.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      // Avoid caching to always get fresh images
      cache: "no-store",
      next: { revalidate: 0 }
    });

    if (!res.ok) throw new Error(`Unsplash error: ${res.status}`);
    const data = await res.json();
    const url = data?.urls?.regular || data?.urls?.full || data?.urls?.raw;
    const previewUrl = null; // 프리뷰 제거
    if (!url) throw new Error("No image URL in Unsplash response");

    const credit = data?.user
      ? {
          authorName: data.user.name,
          authorLink: data.user?.links?.html || null,
          imageLink: data?.links?.html || null,
        }
      : null;

    return Response.json({ url, source: "unsplash-api", keyword, query, credit }, { status: 200 });
  } catch (e) {
    const fallback = `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;
    return Response.json({ url: fallback, source: "fallback", keyword, query, credit: null }, { status: 200 });
  }
}

