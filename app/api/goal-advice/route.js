const GEMINI_MODEL = process.env.GEMINI_MODEL_TIP || "gemini-3.6-flash";

export async function POST(req) {
  const { calories, protein, water, tdee, goal, sport, trains, weeklyHours } = await req.json();

  const goalLabel =
    goal === "cut"
      ? "ცხიმის დაწვა"
      : goal === "muscle"
      ? "კუნთის მატება"
      : "სხეულის რეკომპოზიცია (ცხიმის დაწვა და კუნთის შენარჩუნება/მატება ერთდროულად)";

  const trainingLine = trains
    ? `ვარჯიშობს${sport ? ` (${sport})` : ""}, კვირაში დაახლოებით ${weeklyHours} საათი.`
    : "სტრუქტურირებულ ვარჯიშს რეგულარულად არ აკეთებს.";

  const prompt = `You are a knowledgeable, clear nutrition coach. In Georgian language, explain briefly why these daily targets fit this person's goal. Goal: ${goalLabel}. Training: ${trainingLine} Estimated maintenance calories (TDEE): ~${tdee} kcal. Assigned daily targets: ${calories} kcal, ${protein}g protein, ${water}ml water. Write exactly 2-3 short sentences explaining the reasoning — why this calorie level relative to TDEE, why this protein amount, and a brief note about the water target. Encouraging, concrete tone. Respond with ONLY the explanation text in Georgian, no preamble, no markdown, no headers.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Gemini goal-advice error:", data.error || data);
    return Response.json({ rationale: "", error: data.error?.message || "gemini_http_error" }, { status: 500 });
  }

  const textOut = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  return Response.json({ rationale: textOut.trim() });
}
