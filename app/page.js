"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Droplet, Dumbbell, MessageCircle, Loader2, Flame, Beef, X, Check, LogOut, User } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { TOKENS, todayKey } from "../lib/tokens";
import Ring from "../components/Ring";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);

  const [tab, setTab] = useState("home");
  const [goals, setGoals] = useState({ weight: 75, calories: 2100, protein: 135, water: 2600 });
  const [log, setLog] = useState({ date: todayKey(), foods: [], water: 0 });
  const [rounds, setRounds] = useState(1);
  const [onboard, setOnboard] = useState(false);
  const [weightInput, setWeightInput] = useState("75");
  const [goalInput, setGoalInput] = useState("recomp");

  const [scanImg, setScanImg] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const fileRef = useRef(null);

  const [tip, setTip] = useState("");
  const [tipLoading, setTipLoading] = useState(false);

  // ---- auth + initial load ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setUser(data.session.user);
      await loadData(data.session.user.id);
      setBooting(false);
    })();
  }, []);

  const loadData = async (userId) => {
    const { data: goalRow } = await supabase.from("goals").select("*").eq("user_id", userId).maybeSingle();
    if (goalRow) setGoals({ weight: goalRow.weight, calories: goalRow.calories, protein: goalRow.protein, water: goalRow.water });
    else setOnboard(true);

    const { data: logRow } = await supabase.from("logs").select("*").eq("user_id", userId).eq("date", todayKey()).maybeSingle();
    if (logRow) setLog({ date: logRow.date, foods: logRow.foods || [], water: logRow.water || 0 });
    else {
      await supabase.from("logs").insert({ user_id: userId, date: todayKey(), foods: [], water: 0 });
    }

    const { count } = await supabase.from("logs").select("*", { count: "exact", head: true }).eq("user_id", userId);
    setRounds(count || 1);
  };

  const persistLog = useCallback(
    async (next) => {
      setLog(next);
      if (!user) return;
      await supabase.from("logs").update({ foods: next.foods, water: next.water }).eq("user_id", user.id).eq("date", next.date);
    },
    [user]
  );

  const saveGoals = async (next) => {
    setGoals(next);
    if (!user) return;
    await supabase.from("goals").upsert({ user_id: user.id, ...next });
  };

  const finishOnboard = () => {
    const w = parseFloat(weightInput) || 75;
    let calories, protein;
    if (goalInput === "recomp") {
      calories = Math.round(w * 27);
      protein = Math.round(w * 1.9);
    } else if (goalInput === "cut") {
      calories = Math.round(w * 24);
      protein = Math.round(w * 2.0);
    } else {
      calories = Math.round(w * 31);
      protein = Math.round(w * 1.8);
    }
    const water = Math.round(w * 35);
    saveGoals({ weight: w, calories, protein, water });
    setOnboard(false);
  };

  const totals = log.foods.reduce((a, f) => ({ calories: a.calories + f.calories, protein: a.protein + f.protein }), { calories: 0, protein: 0 });

  const addWater = (ml) => persistLog({ ...log, water: Math.max(0, log.water + ml) });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setScanResult(null);
    const b64 = await fileToBase64(file);
    setScanImg({ b64, mediaType: file.type, url: URL.createObjectURL(file) });
  };

  const analyze = async () => {
    if (!scanImg) return;
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: scanImg.b64, mediaType: scanImg.mediaType }),
      });
      if (!res.ok) throw new Error("analyze failed");
      const parsed = await res.json();
      setScanResult(parsed);
    } catch (e) {
      setScanError("ვერ მოხერხდა ამოცნობა. ცადე თავიდან ან სხვა ფოტოთი.");
    } finally {
      setScanLoading(false);
    }
  };

  const addFoodToLog = () => {
    if (!scanResult) return;
    const entry = {
      name: scanResult.name,
      calories: Number(scanResult.calories) || 0,
      protein: Number(scanResult.protein_g) || 0,
      carbs: Number(scanResult.carbs_g) || 0,
      fat: Number(scanResult.fat_g) || 0,
      t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    persistLog({ ...log, foods: [...log.foods, entry] });
    setScanImg(null);
    setScanResult(null);
    setTab("home");
  };

  const removeFood = (idx) => persistLog({ ...log, foods: log.foods.filter((_, i) => i !== idx) });

  const getTip = async () => {
    setTipLoading(true);
    setTip("");
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals, totals, water: log.water }),
      });
      const data = await res.json();
      setTip(data.tip || "");
    } catch (e) {
      setTip("რჩევის მიღება ვერ მოხერხდა, სცადე ისევ.");
    } finally {
      setTipLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const ruleTips = [];
  const calRemain = goals.calories - totals.calories;
  const protRemain = goals.protein - totals.protein;
  const waterRemain = goals.water - log.water;
  if (protRemain > 20) ruleTips.push(`ცილა ჩამორჩება — კიდევ ~${Math.round(protRemain)}გ დაგჭირდება.`);
  if (calRemain < 0) ruleTips.push(`კალორია გადაცემულია ~${Math.abs(Math.round(calRemain))}-ით — საღამო გაიმსუბუქე.`);
  if (waterRemain > 500) ruleTips.push(`წყალი ჩამორჩება — კიდევ ${waterRemain}მლ დაგჭირდება.`);
  if (ruleTips.length === 0) ruleTips.push("დღეს კარგად მიდიხარ — ასე გააგრძელე! 🥊");

  if (booting) {
    return (
      <div style={{ background: TOKENS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 color={TOKENS.ember} className="animate-spin" size={26} />
      </div>
    );
  }

  return (
    <div style={{ background: TOKENS.bg, minHeight: "100vh" }}>
      <div style={{ borderBottom: `1px solid ${TOKENS.line}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: TOKENS.chalk, letterSpacing: 0.5 }}>🔔 BOXFUEL</span>
        <div style={{ display: "flex", gap: 4, background: TOKENS.surface, borderRadius: 10, padding: 4 }}>
          {[
            { k: "home", icon: Flame, l: "დღეს" },
            { k: "scan", icon: Camera, l: "სკანი" },
            { k: "water", icon: Droplet, l: "წყალი" },
            { k: "advice", icon: MessageCircle, l: "რჩევა" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="bf-btn"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: tab === t.k ? TOKENS.ember : "transparent", color: tab === t.k ? TOKENS.chalk : TOKENS.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif" }}
            >
              <t.icon size={15} /> {t.l}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: TOKENS.muted, fontSize: 12 }}>
            <User size={14} /> {user?.email} · <span style={{ color: TOKENS.ember }}>ROUND {rounds}</span>
          </div>
          <button onClick={logout} className="bf-btn" style={{ background: "none", border: `1px solid ${TOKENS.line}`, borderRadius: 8, padding: 7, color: TOKENS.muted }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: 24 }}>
        {onboard && (
          <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.ember}`, borderRadius: 16, padding: 20, marginBottom: 22, maxWidth: 420 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 15, marginBottom: 12 }}>დავაყენოთ შენი მიზნები</div>
            <label style={{ color: TOKENS.muted, fontSize: 11 }}>წონა (კგ)</label>
            <input className="bf-input" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} type="number" style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 8, padding: 8, marginTop: 4, marginBottom: 12 }} />
            <label style={{ color: TOKENS.muted, fontSize: 11 }}>მიზანი</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 14 }}>
              {[{ k: "cut", l: "ცხიმის დაწვა" }, { k: "recomp", l: "რეკომპოზიცია" }, { k: "muscle", l: "კუნთის მატება" }].map((o) => (
                <button key={o.k} onClick={() => setGoalInput(o.k)} className="bf-btn" style={{ flex: 1, fontSize: 11, padding: "8px 4px", borderRadius: 8, border: `1px solid ${goalInput === o.k ? TOKENS.ember : TOKENS.line}`, background: goalInput === o.k ? "rgba(228,87,46,0.15)" : "transparent", color: goalInput === o.k ? TOKENS.ember : TOKENS.muted }}>
                  {o.l}
                </button>
              ))}
            </div>
            <button className="bf-btn" onClick={finishOnboard} style={{ width: "100%", background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "10px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
              შენახვა
            </button>
          </div>
        )}

        {tab === "home" && (
          <div className="bf-grid">
            <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 18, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 20 }}>
                <Ring value={totals.calories} goal={goals.calories} color={TOKENS.ember} label="კალორია" size={110} />
                <Ring value={totals.protein} goal={goals.protein} color={TOKENS.chalk} label="ცილა" sub="გ" size={110} />
              </div>
              <Ring value={log.water} goal={goals.water} color={TOKENS.amber} label="წყალი" sub="მლ" size={96} />
              <button onClick={() => setOnboard(true)} className="bf-btn" style={{ fontSize: 11, color: TOKENS.amber, background: "none", border: "none", textDecoration: "underline" }}>
                მიზნების შეცვლა
              </button>
            </div>
            <div>
              <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 14, marginBottom: 14, textTransform: "uppercase" }}>დღევანდელი ჩანაწერები</div>
              {log.foods.length === 0 && <div style={{ color: TOKENS.muted, fontSize: 13 }}>ჯერ არაფერი დამატებული — გადადი „სკანი“-ზე.</div>}
              {log.foods.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: TOKENS.chalk, fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                    <div style={{ color: TOKENS.muted, fontSize: 11 }}>{f.t} · {Math.round(f.calories)} kcal · {Math.round(f.protein)}გ ცილა</div>
                  </div>
                  <button onClick={() => removeFood(i)} className="bf-btn" style={{ background: "none", border: "none" }}><X size={16} color={TOKENS.muted} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "scan" && (
          <div style={{ maxWidth: 460 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 16, marginBottom: 16 }}>საკვების სკანირება</div>
            {!scanImg && (
              <button className="bf-btn" onClick={() => fileRef.current?.click()} style={{ width: "100%", height: 200, background: TOKENS.surface, border: `2px dashed ${TOKENS.line}`, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Camera size={30} color={TOKENS.ember} />
                <span style={{ color: TOKENS.muted, fontSize: 13 }}>ატვირთე საკვების ფოტო</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {scanImg && (
              <div>
                <img src={scanImg.url} alt="food" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 12 }} />
                {!scanResult && (
                  <button className="bf-btn" onClick={analyze} disabled={scanLoading} style={{ width: "100%", background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "12px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {scanLoading ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                    {scanLoading ? "ვაანალიზებ..." : "ამოცნობა"}
                  </button>
                )}
                {scanError && <div style={{ color: TOKENS.ember, fontSize: 12, marginTop: 8 }}>{scanError}</div>}
                {scanResult && (
                  <div style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 14, padding: 16, marginTop: 12 }}>
                    <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 15, marginBottom: 8 }}>{scanResult.name}</div>
                    <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Flame size={14} color={TOKENS.ember} /><span style={{ color: TOKENS.chalk, fontSize: 12 }}>{scanResult.calories} kcal</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Beef size={14} color={TOKENS.amber} /><span style={{ color: TOKENS.chalk, fontSize: 12 }}>{scanResult.protein_g}გ ცილა</span></div>
                    </div>
                    <div style={{ color: TOKENS.muted, fontSize: 11, marginBottom: 10 }}>ნახშ. {scanResult.carbs_g}გ · ცხიმი {scanResult.fat_g}გ</div>
                    {scanResult.note && <div style={{ color: TOKENS.muted, fontSize: 12, marginBottom: 12 }}>{scanResult.note}</div>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="bf-btn" onClick={addFoodToLog} style={{ flex: 1, background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "10px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Check size={14} /> დამატება
                      </button>
                      <button className="bf-btn" onClick={() => { setScanImg(null); setScanResult(null); }} style={{ flex: 1, background: "transparent", color: TOKENS.muted, border: `1px solid ${TOKENS.line}`, borderRadius: 10, padding: "10px 0", fontSize: 12 }}>
                        გაუქმება
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "water" && (
          <div style={{ maxWidth: 420 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 16, marginBottom: 20 }}>წყლის მიღება</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <Ring value={log.water} goal={goals.water} color={TOKENS.amber} label="დღეს" sub="მლ" size={150} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[250, 500, 750].map((ml) => (
                <button key={ml} className="bf-btn" onClick={() => addWater(ml)} style={{ flex: 1, background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 10, padding: "14px 0", color: TOKENS.chalk, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <Droplet size={16} color={TOKENS.amber} /> +{ml}მლ
                </button>
              ))}
            </div>
            <button className="bf-btn" onClick={() => addWater(-250)} style={{ width: "100%", background: "transparent", border: `1px solid ${TOKENS.line}`, borderRadius: 10, padding: "8px 0", color: TOKENS.muted, fontSize: 12 }}>
              −250მლ (შესცორება)
            </button>
          </div>
        )}

        {tab === "advice" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 16, marginBottom: 16 }}>რჩევები</div>
            {ruleTips.map((t, i) => (
              <div key={i} style={{ background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 12, padding: 14, marginBottom: 8, color: TOKENS.chalk, fontSize: 13, display: "flex", gap: 8 }}>
                <Dumbbell size={16} color={TOKENS.ember} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{t}</span>
              </div>
            ))}
            <button className="bf-btn" onClick={getTip} disabled={tipLoading} style={{ width: "100%", marginTop: 12, background: "transparent", border: `1px solid ${TOKENS.ember}`, color: TOKENS.ember, borderRadius: 10, padding: "11px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {tipLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              {tipLoading ? "ვთხოვ მწვრთნელს..." : "მწვრთნელის რჩევა"}
            </button>
            {tip && <div style={{ background: "rgba(228,87,46,0.1)", border: `1px solid ${TOKENS.ember}`, borderRadius: 12, padding: 14, marginTop: 10, color: TOKENS.chalk, fontSize: 13 }}>{tip}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
