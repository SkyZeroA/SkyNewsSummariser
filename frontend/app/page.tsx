"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
           News Summary
          </h1>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              In major global developments, world leaders have reached a historic
              climate agreement at the Global Climate Summit in Geneva, with 195
              countries committing to achieve net zero emissions by 2045. The
              landmark deal includes $500 billion in climate finance from developed
              nations to support clean energy transitions in developing countries.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              In technology news, a leading tech company has unveiled a revolutionary
              AI assistant featuring advanced natural language processing and smart
              home integration capabilities. While the innovation promises to transform
              daily technology interactions, privacy advocates have raised concerns
              about data collection practices. The product launches next month in
              select markets.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              On the local front, community members have rallied to save the historic
              Palace Theatre from demolition, raising over $2 million through grassroots
              efforts. The 100-year-old cultural landmark faces replacement by commercial
              development, with a town hall meeting scheduled next week to discuss
              preservation options.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
