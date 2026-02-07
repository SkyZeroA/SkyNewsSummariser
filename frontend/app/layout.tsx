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
    <html lang="en">
      <body
        className={"--font-geist-sans --font-geist-mono antialiased"}
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
