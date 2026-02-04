"use client";

import { Divider } from "@heroui/react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col items-center gap-6 mb-8">
          {/* Brand Section */}
          <div className="text-center">
            <h2 className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Sky News Summariser
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 max-w-md">
              Your intelligent news companion. Get concise, accurate summaries
              of the latest Sky News articles powered by AI.
            </p>
          </div>
        </div>

        <Divider className="my-6" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {currentYear} Sky News Summariser. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

