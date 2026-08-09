# BoxFuel — გაშვების ინსტრუქცია

## 1. Supabase (ბაზა + login) — 5 წუთი
1. გახსენი https://supabase.com და შექმენი უფასო ანგარიში.
2. "New project" → დაარქმევინე სახელი, აირჩიე პაროლი ბაზისთვის, დააჭირე Create.
3. მარცხენა მენიუში: **SQL Editor** → New query → ჩააკოპირე `supabase_schema.sql`-ის შინაარსი → Run.
4. მარცხენა მენიუში: **Settings → API** → დააკოპირე `Project URL` და `anon public` გასაღები.
5. Settings → Authentication → Providers-ში Email ჩართული უნდა იყოს (default already on).
   (თუ არ გინდა email-confirmation, Authentication → Providers → Email → "Confirm email" გამორთე ტესტირებისთვის.)

## 2. API გასაღები
**Gemini** — ორივე ფუნქციისთვის (ფოტოს ამოცნობა + მწვრთნელის რჩევა):
1. https://aistudio.google.com/apikey → Create API key (უფასოა).
2. დააკოპირე გასაღები.

## 3. გარემოს ცვლადები
გადააკოპირე `.env.example` → `.env.local` და შეავსე:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

## 4. ლოკალურად გაშვება (სურვილისამებრ, ტესტისთვის)
```
npm install
npm run dev
```
გახსენი http://localhost:3000

## 5. დეპლოი Vercel-ზე (რეალური საიტი)
1. ეს ფოლდერი ატვირთე GitHub-ზე (ახალი repo).
2. https://vercel.com → Sign up → "Add New Project" → აირჩიე ეს repo.
3. Environment Variables-ში დაამატე იგივე 3 ცვლადი, რაც `.env.local`-ში იყო.
4. Deploy — 1-2 წუთში მიხვდები ცოცხალ URL-ს (მაგ. `boxfuel.vercel.app`).

## 6. საკუთარი დომეინი (სურვილისამებრ)
Vercel Project → Settings → Domains → დაამატე შენი დომეინი (ნაყიდი Namecheap/GoDaddy-დან) და მიმართე DNS ჩანაწერები, რასაც Vercel გიჩვენებს.

---
**შემდეგი ნაბიჯები Claude Code-ში:** თუ გინდა ბოქსის ვარჯიშების ჟურნალი, streak-ები, ან push-შეტყობინებები წყლის შესახსენებლად — ეს ფაილები წაიღე Claude Code-ში და მითხარი რა დაამატო.
