// "Ink & Brass" palette — a cooler, deeper alternative (navy-black base,
// warm brass accent, dusty rose for water) since the previous warm
// obsidian/copper combo wasn't a fit. Keys unchanged so every component
// picks up the new look automatically.
export const TOKENS = {
  bg: "#0B0E14",       // deep ink navy-black
  surface: "#141822",  // card surface
  surface2: "#1C212E", // recessed surface (inputs, track backgrounds)
  ember: "#B99B4D",    // primary accent — muted brass/gold
  chalk: "#EDEFF3",    // cool ivory text
  amber: "#B5677A",    // secondary accent — dusty rose (water)
  muted: "#8892A0",    // secondary/quiet text
  line: "#232838",     // hairline borders
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

// Standard TDEE activity tiers, driven by actual weekly training volume
// (days/week × hours/session) instead of a single fixed multiplier — this is
// what makes the calculation work for any sport, or for someone who
// doesn't train structured sessions at all.
function activityMultiplier(trains, daysPerWeek, sessionHours) {
  if (!trains || !daysPerWeek) return 1.3; // everyday activity only, no structured training
  const weeklyHours = (parseFloat(daysPerWeek) || 0) * (parseFloat(sessionHours) || 0);
  if (weeklyHours <= 2) return 1.375;
  if (weeklyHours <= 5) return 1.55;
  if (weeklyHours <= 9) return 1.725;
  return 1.9;
}

// Mifflin-St Jeor based daily targets, scaled by real training volume.
// (The written explanation of *why* these numbers fit the goal is generated
// by Gemini, not hardcoded here — see /api/goal-advice.)
export function computeGoals({ weight, height, age, gender, goal, trains, daysPerWeek, sessionHours }) {
  const w = parseFloat(weight) || 70;
  const h = parseFloat(height) || 175;
  const a = parseFloat(age) || 25;

  const bmr = gender === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  const mult = activityMultiplier(trains, daysPerWeek, sessionHours);
  const tdee = bmr * mult;
  const weeklyHours = trains ? Math.round((parseFloat(daysPerWeek) || 0) * (parseFloat(sessionHours) || 0) * 10) / 10 : 0;

  let calories, protein;
  if (goal === "cut") {
    calories = Math.round(tdee - 450);
    protein = Math.round(w * 2.2);
  } else if (goal === "muscle") {
    calories = Math.round(tdee + 300);
    protein = Math.round(w * 1.8);
  } else {
    calories = Math.round(tdee - 150);
    protein = Math.round(w * 2.0);
  }
  const water = Math.round(w * 35 + (trains ? 500 : 0)); // +500ml on training days
  return { calories, protein, water, tdee: Math.round(tdee), weeklyHours };
}