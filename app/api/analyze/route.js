// Food photo scanning is powered by Google's Gemini API (multimodal vision).
// Get a free key at https://aistudio.google.com/apikey and set GEMINI_API_KEY
// in your environment variables. Model name is configurable via GEMINI_MODEL
// in case Google renames/retires a version later.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export async function POST(req) {
  const { imageBase64, mediaType } = await req.json();

  const prompt =
    "You're a nutrition tracker for a boxer doing body recomposition. Look at this food photo and identify the food(s) and estimate a realistic serving. Respond with ONLY strict JSON, no markdown, no commentary, in this exact shape: {\"name\":\"short food name\",\"calories\":number,\"protein_g\":number,\"carbs_g\":number,\"fat_g\":number,\"note\":\"one short practical sentence in Georgian about how this fits a cutting/recomp diet\"}";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mediaType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("Gemini analyze error:", data.error || data);
    return Response.json({ error: data.error?.message || "gemini_http_error" }, { status: 500 });
  }

  if (data.promptFeedback?.blockReason) {
    return Response.json({ error: "blocked:" + data.promptFeedback.blockReason }, { status: 500 });
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    console.error("Gemini analyze: no candidate", data);
    return Response.json({ error: "no_candidate" }, { status: 500 });
  }

  const textOut = candidate.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  if (!textOut) {
    return Response.json({ error: "empty_response" }, { status: 500 });
  }

  try {
    const cleaned = textOut.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch (e) {
    console.error("Gemini analyze: parse failed", textOut.slice(0, 300));
    return Response.json({ error: "parse_failed" }, { status: 500 });
  }
}
