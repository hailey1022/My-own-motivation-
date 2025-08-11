// Safe env diagnostics for deployment. Does NOT return secrets.
export async function GET() {
  try {
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasUnsplash = Boolean(process.env.UNSPLASH_ACCESS_KEY);
    const hasPexels = Boolean(process.env.PEXELS_API_KEY);
    const nodeEnv = process.env.NODE_ENV || null;
    const vercel = Boolean(process.env.VERCEL);
    const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || null;
    const commitMsg = process.env.VERCEL_GIT_COMMIT_MESSAGE || null;

    return Response.json(
      {
        ok: true,
        env: {
          hasOpenAI,
          hasUnsplash,
          hasPexels,
          nodeEnv,
          vercel,
          commitSha,
          commitMsg,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return Response.json({ ok: false }, { status: 200 });
  }
}


