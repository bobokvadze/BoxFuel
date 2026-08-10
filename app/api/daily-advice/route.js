const GEMINI_MODEL = process.env.GEMINI_MODEL_TIP || "gemini-3.6-flash";

export async function POST(req) {
  const { goals, totals, water, sportType } = await req.json();

  const sport = sportType && sportType.trim() ? sportType.trim() : "ფიტნესი";
  const calRemain = Math.round(goals.calories - totals.calories);
  const protRemain = Math.round(goals.protein - totals.protein);
  const waterRemain = Math.round(goals.water - water);

  const prompt = `You are a nutrition coach for an athlete training in: ${sport}. Their daily targets: ${goals.calories} kcal, ${goals.protein}g protein, ${goals.water}ml water. So far today: ${totals.calories} kcal eaten, ${totals.protein}g protein eaten, ${water}ml water drunk. Remaining: ${calRemain} kcal, ${protRemain}g protein, ${waterRemain}ml water (negative remaining calories means they're over target). Write 1 to 3 short, specific, actionable tips in Georgian language about what to do next today, based on what's actually remaining or over. If everything looks on track, write one short encouraging line instead. Respond with ONLY strict JSON, no markdown, in this exact shape: {"tips":["tip 1 in Georgian", "tip 2 in Georgian"]}. Each tip should be one short sentence.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: "application/json" },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Gemini daily-advice error:", data.error || data);
    return Response.json({ tips: [], error: data.error?.message || "gemini_http_error" }, { status: 500 });
  }

  const textOut = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  try {
    const cleaned = textOut.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json({ tips: Array.isArray(parsed.tips) ? parsed.tips : [] });
  } catch (e) {
    console.error("Gemini daily-advice: parse failed", textOut.slice(0, 300));
    return Response.json({ tips: [], error: "parse_failed" }, { status: 500 });
  }
}