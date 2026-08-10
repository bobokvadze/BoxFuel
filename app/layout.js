import "./globals.css";

export const metadata = {
  title: "FormAI",
  description: "საკვების, ცილის და წყლის ტრეკერი — ნებისმიერი სპორტისთვის",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ka">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}