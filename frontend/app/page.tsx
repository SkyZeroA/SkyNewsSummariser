"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Breaking: Major Climate Summit Reaches Historic Agreement
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Published: February 4, 2026 | 15,000 views
          </p>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              World leaders have reached a groundbreaking agreement at the
              Global Climate Summit in Geneva, marking what many are calling
              the most significant environmental accord in decades. The
              agreement, signed by representatives from 195 countries,
              establishes ambitious new targets for carbon emissions reduction
              and renewable energy adoption.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The landmark deal commits participating nations to achieving net
              zero emissions by 2045, five years earlier than previous targets.
              Additionally, developed countries have pledged $500 billion in
              climate finance to support developing nations in their transition
              to clean energy.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Environmental groups have cautiously welcomed the agreement, while
              calling for swift implementation and accountability measures to
              ensure countries meet their commitments.
            </p>
          </div>
        </article>

        <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tech Giant Announces Revolutionary AI Assistant
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Published: February 3, 2026 | 12,500 views
          </p>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              In a surprise announcement today, leading technology company
              unveiled its latest artificial intelligence assistant, promising
              to revolutionize how people interact with technology in their
              daily lives. The new AI system features advanced natural language
              processing and contextual understanding capabilities.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The assistant can seamlessly integrate with smart home devices,
              manage schedules, and provide personalized recommendations based
              on user preferences and behavior patterns. Privacy advocates have
              raised concerns about data collection, prompting the company to
              emphasize its commitment to user privacy and data security.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              The product is expected to launch in select markets next month,
              with a global rollout planned for later this year.
            </p>
          </div>
        </article>

        <article className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Local Community Rallies to Save Historic Theatre
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Published: February 2, 2026 | 8,200 views
          </p>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Residents of the historic downtown district have launched a
              grassroots campaign to preserve the beloved Palace Theatre, which
              faces demolition to make way for a new commercial development.
              The 100-year-old venue has been a cultural cornerstone of the
              community for generations.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The Save Our Theatre campaign has already raised over $2 million
              through crowdfunding and local donations. Organizers are working
              with city officials to explore alternative development plans that
              would preserve the historic building while allowing for
              neighborhood growth.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              A town hall meeting is scheduled for next week to discuss the
              theatre's future and gather community input on preservation
              options.
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
