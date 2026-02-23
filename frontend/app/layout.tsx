import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Sky News Summariser",
  description: "Your intelligent news companion. Get concise, accurate summaries of the latest Sky News articles powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Helper to get cookie value
                function getCookie(name) {
                  const value = '; ' + document.cookie;
                  const parts = value.split('; ' + name + '=');
                  if (parts.length === 2) return parts.pop().split(';').shift();
                  return null;
                }

                const savedTheme = getCookie('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={"--font-geist-sans --font-geist-mono antialiased"}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
