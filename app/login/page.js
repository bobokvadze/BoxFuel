"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { TOKENS } from "../../lib/tokens";
import { Target } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("in"); // in | new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setInfo("");
    if (!email || !password) {
      setError("შეავსე ემაილი და პაროლი");
      return;
    }
    setLoading(true);
    try {
      if (mode === "new") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          router.push("/");
        } else {
          setInfo("გაგზავნილია დამადასტურებელი წერილი შენს ფოსტაზე — გახსენი და დააჭირე ბმულს, შემდეგ დაბრუნდი და შედი ანგარიშში.");
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push("/");
      }
    } catch (e) {
      setError(e.message === "Invalid login credentials" ? "ემაილი ან პაროლი არასწორია" : "შეცდომა, სცადე ისევ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 30% 20%, #23201A 0%, ${TOKENS.bg} 65%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, color: TOKENS.chalk, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <Target size={24} color={TOKENS.ember} /> FORMA
          </span>
        </div>
        <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 20, padding: 26, boxShadow: "0 12px 40px -12px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: TOKENS.surface2, borderRadius: 10, padding: 4 }}>
            {[{ k: "in", l: "შესვლა" }, { k: "new", l: "ახალი პროფილი" }].map((m) => (
              <button
                key={m.k}
                onClick={() => setMode(m.k)}
                className="bf-btn"
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 12,
                  fontFamily: "'Oswald', sans-serif",
                  background: mode === m.k ? TOKENS.ember : "transparent",
                  color: mode === m.k ? TOKENS.chalk : TOKENS.muted,
                }}
              >
                {m.l}
              </button>
            ))}
          </div>
          <label style={{ color: TOKENS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>ემაილი</label>
          <input
            className="bf-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 14, fontSize: 14 }}
          />
          <label style={{ color: TOKENS.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>პაროლი</label>
          <input
            className="bf-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 8, padding: 10, marginTop: 4, marginBottom: 16, fontSize: 14 }}
          />
          {error && <div style={{ color: TOKENS.ember, fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {info && <div style={{ color: TOKENS.amber, fontSize: 12, marginBottom: 12 }}>{info}</div>}
          <button
            onClick={submit}
            disabled={loading}
            className="bf-btn"
            style={{ width: "100%", background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "12px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}
          >
            {loading ? "..." : mode === "new" ? "პროფილის შექმნა" : "შესვლა"}
          </button>
        </div>
      </div>
    </div>
  );
}