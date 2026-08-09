const GEMINI_MODEL = process.env.GEMINI_MODEL_TIP || "gemini-3.6-flash";

export async function POST(req) {
  const { goals, totals, water } = await req.json();

  const prompt = `You are a blunt, encouraging boxing coach who also knows nutrition. The athlete's daily goals: ${goals.calories} kcal, ${goals.protein}g protein, ${goals.water}ml water. So far today they've had ${totals.calories} kcal, ${totals.protein}g protein, ${water}ml water, and it's currently ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Give ONE short, specific, motivating tip (max 2 sentences) in Georgian language for what they should do next with food or water, in a boxing-coach voice.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();

  if (data.error) {
    return Response.json({ tip: "", error: data.error.message || "gemini_error" }, { status: 500 });
  }

  const textOut = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return Response.json({ tip: textOut.trim() });
}
