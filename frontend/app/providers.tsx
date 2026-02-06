"use client";

import { HeroUIProvider } from "@heroui/react";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <HeroUIProvider>{children}</HeroUIProvider>
);

