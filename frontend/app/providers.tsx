"use client";

import { HeroUIProvider } from "@heroui/react";
import React, { createContext, useContext, useEffect, useState } from "react";

const ConfigContext = createContext<{ apiUrl: string | null }>({ apiUrl: null });

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiUrl, setApiUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/config.json")
      .then((res) => res.json())
      .then((data) => setApiUrl(data.apiUrl));
  }, []);

  if (!apiUrl) {
    return null;
  }

  return (
    <ConfigContext.Provider value={{ apiUrl }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);

// Combine both providers
export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ConfigProvider>
    <HeroUIProvider>{children}</HeroUIProvider>
  </ConfigProvider>
);