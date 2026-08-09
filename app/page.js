"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Droplet, Dumbbell, MessageCircle, Loader2, Flame, Beef, X, Check, LogOut, User, BarChart3 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { TOKENS, todayKey, computeGoals } from "../lib/tokens";
import Ring from "../components/Ring";

const NAV = [
  { k: "home", icon: Flame, l: "დღეს" },
  { k: "scan", icon: Camera, l: "სკანი" },
  { k: "water", icon: Droplet, l: "წყალი" },
  { k: "stats", icon: BarChart3, l: "სტატ." },
  { k: "advice", icon: MessageCircle, l: "რჩევა" },
];

const card = { background: TOKENS.surface, border: `1px solid ${TOKENS.line}`, borderRadius: 18, boxShadow: "0 4px 24px -8px rgba(0,0,0,0.35)" };

// Resize + re-encode the photo before it ever leaves the browser. Phone camera
// photos are often 3-8MB, which can exceed serverless request-body limits and
// silently fail. Shrinking to a sane max dimension fixes that and speeds up
// the round-trip to Gemini.
function compressImage(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ b64: dataUrl.split(",")[1], mediaType: "image/jpeg", url: dataUrl });
      };
      img.onerror = () => reject(new Error("image_decode_failed"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
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
  const [heightInput, setHeightInput] = useState("175");
  const [ageInput, setAgeInput] = useState("25");
  const [genderInput, setGenderInput] = useState("male");
  const [goalInput, setGoalInput] = useState("recomp");

  const [scanImg, setScanImg] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const fileRef = useRef(null);

  const [tip, setTip] = useState("");
  const [tipLoading, setTipLoading] = useState(false);

  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const statsLoaded = useRef(false);

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

  useEffect(() => {
    if (tab === "stats" && !statsLoaded.current && user) {
      statsLoaded.current = true;
      fetchStats();
    }
  }, [tab, user]);

  const loadData = async (userId) => {
    const { data: goalRow } = await supabase.from("goals").select("*").eq("user_id", userId).maybeSingle();
    if (goalRow) {
      setGoals({ weight: goalRow.weight, calories: goalRow.calories, protein: goalRow.protein, water: goalRow.water });
      if (goalRow.height) setHeightInput(String(goalRow.height));
      if (goalRow.age) setAgeInput(String(goalRow.age));
      if (goalRow.gender) setGenderInput(goalRow.gender);
      setWeightInput(String(goalRow.weight));
    } else setOnboard(true);

    const { data: logRow } = await supabase.from("logs").select("*").eq("user_id", userId).eq("date", todayKey()).maybeSingle();
    if (logRow) setLog({ date: logRow.date, foods: logRow.foods || [], water: logRow.water || 0 });
    else {
      await supabase.from("logs").insert({ user_id: userId, date: todayKey(), foods: [], water: 0 });
    }

    const { count } = await supabase.from("logs").select("*", { count: "exact", head: true }).eq("user_id", userId);
    setRounds(count || 1);
  };

  const fetchStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    const { data } = await supabase
      .from("logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(14);
    const rows = (data || []).map((r) => ({
      date: r.date,
      calories: (r.foods || []).reduce((a, f) => a + (f.calories || 0), 0),
      protein: (r.foods || []).reduce((a, f) => a + (f.protein || 0), 0),
      water: r.water || 0,
    }));
    setStats(rows);
    setStatsLoading(false);
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
    const preview = computeGoals({ weight: weightInput, height: heightInput, age: ageInput, gender: genderInput, goal: goalInput });
    saveGoals({
      weight: parseFloat(weightInput) || 75,
      height: parseFloat(heightInput) || 175,
      age: parseFloat(ageInput) || 25,
      gender: genderInput,
      calories: preview.calories,
      protein: preview.protein,
      water: preview.water,
    });
    setOnboard(false);
  };

  const goalPreview = computeGoals({ weight: weightInput, height: heightInput, age: ageInput, gender: genderInput, goal: goalInput });

  const totals = log.foods.reduce((a, f) => ({ calories: a.calories + f.calories, protein: a.protein + f.protein }), { calories: 0, protein: 0 });

  const addWater = (ml) => persistLog({ ...log, water: Math.max(0, log.water + ml) });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setScanResult(null);
    try {
      const compressed = await compressImage(file);
      setScanImg(compressed);
    } catch (err) {
      setScanError("ფოტოს წაკითხვა ვერ მოხერხდა — სცადე სხვა ფოტო.");
    }
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
      const parsed = await res.json();
      if (!res.ok || parsed.error) {
        console.error("analyze error:", parsed.error);
        setScanError("ვერ მოხერხდა ამოცნობა — სცადე უფრო ახლო/ნათელი ფოტო, ან სცადე ერთი წუთის შემდეგ.");
        return;
      }
      setScanResult(parsed);
    } catch (e) {
      setScanError("კავშირის შეცდომა — შეამოწმე ინტერნეტი და სცადე ისევ.");
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

  const maxStatCal = Math.max(1, ...stats.map((s) => s.calories));

  if (booting) {
    return (
      <div style={{ background: TOKENS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 color={TOKENS.ember} className="animate-spin" size={26} />
      </div>
    );
  }

  return (
    <div style={{ background: TOKENS.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${TOKENS.line}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, background: "rgba(14,13,11,0.92)", backdropFilter: "blur(10px)", zIndex: 20 }}>
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 19, color: TOKENS.chalk, letterSpacing: 0.5, whiteSpace: "nowrap" }}>🔔 BOXFUEL</span>

        <div className="bf-topnav" style={{ gap: 4, background: TOKENS.surface, borderRadius: 10, padding: 4 }}>
          {NAV.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className="bf-btn"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8, border: "none", background: tab === t.k ? TOKENS.ember : "transparent", color: tab === t.k ? TOKENS.chalk : TOKENS.muted, fontSize: 12.5, fontFamily: "'Oswald', sans-serif", whiteSpace: "nowrap" }}
            >
              <t.icon size={14} /> {t.l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="bf-email" style={{ display: "flex", alignItems: "center", gap: 6, color: TOKENS.muted, fontSize: 12 }}>
            <User size={13} /> {user?.email}
          </div>
          <span style={{ color: TOKENS.ember, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, border: `1px solid ${TOKENS.ember}`, borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" }}>
            R.{rounds}
          </span>
          <button onClick={logout} className="bf-btn" style={{ background: "none", border: `1px solid ${TOKENS.line}`, borderRadius: 8, padding: 7, color: TOKENS.muted, display: "flex" }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bf-content" style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 20px" }}>
        {onboard && (
          <div style={{ ...card, border: `1px solid ${TOKENS.ember}`, padding: 20, marginBottom: 22, maxWidth: 460 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 15, marginBottom: 14 }}>დავაყენოთ შენი მიზნები</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: TOKENS.muted, fontSize: 11 }}>წონა (კგ)</label>
                <input className="bf-input" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} type="number" style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 10, padding: 11, marginTop: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: TOKENS.muted, fontSize: 11 }}>სიმაღლე (სმ)</label>
                <input className="bf-input" value={heightInput} onChange={(e) => setHeightInput(e.target.value)} type="number" style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 10, padding: 11, marginTop: 4 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: TOKENS.muted, fontSize: 11 }}>ასაკი</label>
                <input className="bf-input" value={ageInput} onChange={(e) => setAgeInput(e.target.value)} type="number" style={{ width: "100%", background: TOKENS.surface2, border: `1px solid ${TOKENS.line}`, color: TOKENS.chalk, borderRadius: 10, padding: 11, marginTop: 4 }} />
              </div>
            </div>

            <label style={{ color: TOKENS.muted, fontSize: 11 }}>სქესი (ზუსტი გამოთვლისთვის)</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 14 }}>
              {[{ k: "male", l: "მამრობითი" }, { k: "female", l: "მდედრობითი" }].map((o) => (
                <button key={o.k} onClick={() => setGenderInput(o.k)} className="bf-btn" style={{ flex: 1, fontSize: 12, padding: "9px 4px", borderRadius: 9, border: `1px solid ${genderInput === o.k ? TOKENS.ember : TOKENS.line}`, background: genderInput === o.k ? "rgba(184,121,74,0.15)" : "transparent", color: genderInput === o.k ? TOKENS.ember : TOKENS.muted }}>
                  {o.l}
                </button>
              ))}
            </div>

            <label style={{ color: TOKENS.muted, fontSize: 11 }}>მიზანი</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 16 }}>
              {[{ k: "cut", l: "ცხიმის დაწვა" }, { k: "recomp", l: "რეკომპოზიცია" }, { k: "muscle", l: "კუნთის მატება" }].map((o) => (
                <button key={o.k} onClick={() => setGoalInput(o.k)} className="bf-btn" style={{ flex: 1, fontSize: 11, padding: "9px 4px", borderRadius: 9, border: `1px solid ${goalInput === o.k ? TOKENS.ember : TOKENS.line}`, background: goalInput === o.k ? "rgba(184,121,74,0.15)" : "transparent", color: goalInput === o.k ? TOKENS.ember : TOKENS.muted }}>
                  {o.l}
                </button>
              ))}
            </div>

            <div style={{ background: TOKENS.surface2, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
                <div><div style={{ color: TOKENS.ember, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{goalPreview.calories}</div><div style={{ color: TOKENS.muted, fontSize: 10, textTransform: "uppercase" }}>კკალ</div></div>
                <div><div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{goalPreview.protein}გ</div><div style={{ color: TOKENS.muted, fontSize: 10, textTransform: "uppercase" }}>ცილა</div></div>
                <div><div style={{ color: TOKENS.amber, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{goalPreview.water}</div><div style={{ color: TOKENS.muted, fontSize: 10, textTransform: "uppercase" }}>მლ წყალი</div></div>
              </div>
              <div style={{ color: TOKENS.muted, fontSize: 12, lineHeight: 1.6 }}>{goalPreview.rationale}</div>
            </div>

            <button className="bf-btn" onClick={finishOnboard} style={{ width: "100%", background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "11px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
              შენახვა
            </button>
          </div>
        )}

        {tab === "home" && (
          <div className="bf-grid">
            <div style={{ ...card, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
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
              <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 1, marginBottom: 14, textTransform: "uppercase" }}>დღევანდელი ჩანაწერები</div>
              {log.foods.length === 0 && <div style={{ color: TOKENS.muted, fontSize: 13 }}>ჯერ არაფერი დამატებული — გადადი „სკანი“-ზე.</div>}
              {log.foods.map((f, i) => (
                <div key={i} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", marginBottom: 9 }}>
                  <div>
                    <div style={{ color: TOKENS.chalk, fontSize: 13.5, fontWeight: 600 }}>{f.name}</div>
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
              <button className="bf-btn" onClick={() => fileRef.current?.click()} style={{ width: "100%", height: 200, ...card, border: `2px dashed ${TOKENS.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Camera size={30} color={TOKENS.ember} />
                <span style={{ color: TOKENS.muted, fontSize: 13 }}>ატვირთე საკვების ფოტო</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {scanImg && (
              <div>
                <img src={scanImg.url} alt="food" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, marginBottom: 12 }} />
                {!scanResult && (
                  <button className="bf-btn" onClick={analyze} disabled={scanLoading} style={{ width: "100%", background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "13px 0", fontFamily: "'Oswald', sans-serif", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {scanLoading ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
                    {scanLoading ? "ვაანალიზებ..." : "ამოცნობა"}
                  </button>
                )}
                {scanError && <div style={{ color: TOKENS.ember, fontSize: 12, marginTop: 8 }}>{scanError}</div>}
                {scanResult && (
                  <div style={{ ...card, padding: 16, marginTop: 12 }}>
                    <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 15, marginBottom: 8 }}>{scanResult.name}</div>
                    <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Flame size={14} color={TOKENS.ember} /><span style={{ color: TOKENS.chalk, fontSize: 12 }}>{scanResult.calories} kcal</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}><Beef size={14} color={TOKENS.amber} /><span style={{ color: TOKENS.chalk, fontSize: 12 }}>{scanResult.protein_g}გ ცილა</span></div>
                    </div>
                    <div style={{ color: TOKENS.muted, fontSize: 11, marginBottom: 10 }}>ნახშ. {scanResult.carbs_g}გ · ცხიმი {scanResult.fat_g}გ</div>
                    {scanResult.note && <div style={{ color: TOKENS.muted, fontSize: 12, marginBottom: 12 }}>{scanResult.note}</div>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="bf-btn" onClick={addFoodToLog} style={{ flex: 1, background: TOKENS.ember, color: TOKENS.chalk, border: "none", borderRadius: 10, padding: "11px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Check size={14} /> დამატება
                      </button>
                      <button className="bf-btn" onClick={() => { setScanImg(null); setScanResult(null); }} style={{ flex: 1, background: "transparent", color: TOKENS.muted, border: `1px solid ${TOKENS.line}`, borderRadius: 10, padding: "11px 0", fontSize: 12 }}>
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
                <button key={ml} className="bf-btn" onClick={() => addWater(ml)} style={{ flex: 1, ...card, padding: "15px 0", color: TOKENS.chalk, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <Droplet size={16} color={TOKENS.amber} /> +{ml}მლ
                </button>
              ))}
            </div>
            <button className="bf-btn" onClick={() => addWater(-250)} style={{ width: "100%", background: "transparent", border: `1px solid ${TOKENS.line}`, borderRadius: 10, padding: "9px 0", color: TOKENS.muted, fontSize: 12 }}>
              −250მლ (შესცორება)
            </button>
          </div>
        )}

        {tab === "stats" && (
          <div style={{ maxWidth: 620 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 16, marginBottom: 6 }}>სტატისტიკა დღეების მიხედვით</div>
            <div style={{ color: TOKENS.muted, fontSize: 12, marginBottom: 18 }}>ბოლო 14 დღე</div>
            {statsLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                <Loader2 color={TOKENS.ember} className="animate-spin" size={22} />
              </div>
            )}
            {!statsLoading && stats.length === 0 && <div style={{ color: TOKENS.muted, fontSize: 13 }}>ჯერ არ არის საკმარისი მონაცემი.</div>}
            {!statsLoading && stats.map((s) => {
              const pct = Math.round((s.calories / maxStatCal) * 100);
              const dateLabel = `${s.date.slice(8, 10)}.${s.date.slice(5, 7)}`;
              return (
                <div key={s.date} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ width: 42, fontSize: 11, color: TOKENS.muted, flexShrink: 0 }}>{dateLabel}</div>
                  <div style={{ flex: 1, height: 9, background: TOKENS.surface2, borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: TOKENS.ember, borderRadius: 6, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ width: 66, textAlign: "right", fontSize: 12, color: TOKENS.chalk, flexShrink: 0 }}>{Math.round(s.calories)} kcal</div>
                  <div className="bf-stat-extra" style={{ width: 54, textAlign: "right", fontSize: 11, color: TOKENS.muted, flexShrink: 0 }}>{Math.round(s.protein)}გ</div>
                  <div className="bf-stat-extra" style={{ width: 58, textAlign: "right", fontSize: 11, color: TOKENS.amber, flexShrink: 0 }}>{s.water}მლ</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "advice" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ color: TOKENS.chalk, fontFamily: "'Oswald', sans-serif", fontSize: 16, marginBottom: 16 }}>რჩევები</div>
            {ruleTips.map((t, i) => (
              <div key={i} style={{ ...card, padding: 14, marginBottom: 8, color: TOKENS.chalk, fontSize: 13, display: "flex", gap: 8 }}>
                <Dumbbell size={16} color={TOKENS.ember} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{t}</span>
              </div>
            ))}
            <button className="bf-btn" onClick={getTip} disabled={tipLoading} style={{ width: "100%", marginTop: 12, background: "transparent", border: `1px solid ${TOKENS.ember}`, color: TOKENS.ember, borderRadius: 10, padding: "12px 0", fontFamily: "'Oswald', sans-serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {tipLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              {tipLoading ? "ვთხოვ მწვრთნელს..." : "მწვრთნელის რჩევა"}
            </button>
            {tip && <div style={{ ...card, background: "rgba(184,121,74,0.08)", border: `1px solid ${TOKENS.ember}`, padding: 14, marginTop: 10, color: TOKENS.chalk, fontSize: 13 }}>{tip}</div>}
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="bf-bottomnav">
        {NAV.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="bf-btn"
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "9px 0 6px", background: "none", border: "none", color: tab === t.k ? TOKENS.ember : TOKENS.muted }}
          >
            <t.icon size={19} />
            <span style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif" }}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
