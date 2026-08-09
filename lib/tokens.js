// "Obsidian & Copper" palette — a quieter, more editorial alternative to the
// original bright ember/amber combo. Keys are unchanged so every component
// that already imports TOKENS picks up the new look automatically.
export const TOKENS = {
  bg: "#0E0D0B",       // near-black, warm undertone
  surface: "#171512",  // card surface
  surface2: "#201D19", // recessed surface (inputs, track backgrounds)
  ember: "#B8794A",    // primary accent — muted copper (was bright orange-red)
  chalk: "#EDE6DA",    // warm ivory text
  amber: "#4F8079",    // secondary accent — deep teal (was bright amber)
  muted: "#948A7D",    // secondary/quiet text
  line: "#2A2622",     // hairline borders
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

// Mifflin-St Jeor based daily targets, tuned for a boxer training regularly.
export function computeGoals({ weight, height, age, gender, goal }) {
  const w = parseFloat(weight) || 70;
  const h = parseFloat(height) || 175;
  const a = parseFloat(age) || 25;

  const bmr = gender === "female" ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
  const tdee = bmr * 1.6; // moderately-to-highly active: regular boxing training

  let calories, protein, rationale;
  if (goal === "cut") {
    calories = Math.round(tdee - 450);
    protein = Math.round(w * 2.2);
    rationale = `დღიური მოთხოვნა (TDEE) დაახლოებით ${Math.round(tdee)} კკალ-ია. ცხიმის დაწვისთვის ზომიერი დეფიციტი (−450 კკალ) საკმარისია — უფრო მკვეთრი დეფიციტი კრივის ვარჯიშზე ენერგიას წაგართმევდა. ცილა მაღალია (2.2გ/კგ), რომ დეფიციტში კუნთი არ დაიწვას.`;
  } else if (goal === "muscle") {
    calories = Math.round(tdee + 300);
    protein = Math.round(w * 1.8);
    rationale = `TDEE ~${Math.round(tdee)} კკალ. კუნთის მატებისთვის მცირე სიჭარბე (+300 კკალ) სჭირდება ახალი ქსოვილის ასაშენებლად, ${protein}გ ცილა კი საკმარისია კუნთის სინთეზისთვის ვარჯიშის შემდეგ.`;
  } else {
    calories = Math.round(tdee - 150);
    protein = Math.round(w * 2.0);
    rationale = `TDEE ~${Math.round(tdee)} კკალ. რეკომპოზიციისთვის მინიმალური დეფიციტი (−150 კკალ) და მაღალი ცილა (${protein}გ) ერთდროულად ცხიმის დაწვასა და კუნთის შენარჩუნებას/მატებას შესაძლებელს ხდის — ეს ყველაზე ნელი, მაგრამ ყველაზე საიმედო გზაა.`;
  }
  const water = Math.round(w * 35 + 500); // +500ml for training-day sweat loss
  return { calories, protein, water, tdee: Math.round(tdee), rationale };
}
