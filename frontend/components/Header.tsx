"use client";

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
  Switch,
  Button,
  ButtonGroup,
} from "@heroui/react";
import { useState, useEffect } from "react";

// Apply font size to document
const applyFontSize = (size: "small" | "medium" | "large") => {
  document.documentElement.classList.remove(
    "text-size-small",
    "text-size-medium",
    "text-size-large",
  );
  document.documentElement.classList.add(`text-size-${size}`);
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  // Initialize state from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setIsDarkMode(savedTheme === "dark" || (!savedTheme && prefersDark));

    const savedFontSize = localStorage.getItem("fontSize") as
      | "small"
      | "medium"
      | "large"
      | null;
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
  }, []);

  // Apply dark mode on mount and when it changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Apply font size on mount and when it changes
  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  // Change font size
  const changeFontSize = (size: "small" | "medium" | "large") => {
    setFontSize(size);
    applyFontSize(size);
    localStorage.setItem("fontSize", size);
  };

  const menuItems = [
    { name: "News", href: "/news" },
    { name: "Summaries", href: "/summaries" },
  ];

  return (
    <Navbar
      isBordered
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-white dark:bg-gray-900"
      maxWidth="xl"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden text-gray-900 dark:text-gray-100"
        />
        <NavbarBrand>
          <Link href="/" className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity cursor-pointer">
            Sky News Summariser
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-6" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.name}>
            <Link
              color="foreground"
              href={item.href}
              className="hover:text-blue-600 transition-colors"
            >
              {item.name}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex">
          <ButtonGroup size="sm" variant="flat">
            <Button
              color={fontSize === "small" ? "primary" : "default"}
              onPress={() => changeFontSize("small")}
              className="min-w-unit-8 px-2"
            >
              <span className="text-xs !text-xs">A</span>
            </Button>
            <Button
              color={fontSize === "medium" ? "primary" : "default"}
              onPress={() => changeFontSize("medium")}
              className="min-w-unit-10 px-2"
            >
              <span className="text-sm !text-sm">A</span>
            </Button>
            <Button
              color={fontSize === "large" ? "primary" : "default"}
              onPress={() => changeFontSize("large")}
              className="min-w-unit-12 px-2"
            >
              <span className="text-base !text-base">A</span>
            </Button>
          </ButtonGroup>
        </NavbarItem>
        <NavbarItem>
          <Switch
            isSelected={isDarkMode}
            onValueChange={toggleDarkMode}
            size="sm"
            color="primary"
            startContent={<span className="text-xs">☀️</span>}
            endContent={<span className="text-xs">🌙</span>}
            aria-label="Toggle dark mode"
          />
        </NavbarItem>
        <NavbarItem>
          <Link href="/admin/login" className="text-sm">
            Admin Login
          </Link>
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.name}-${index}`}>
            <Link
              className="w-full"
              color="foreground"
              href={item.href}
              size="lg"
            >
              {item.name}
            </Link>
          </NavbarMenuItem>
        ))}

        {/* Admin Login Link for Mobile */}
        <NavbarMenuItem>
          <Link
            className="w-full"
            color="primary"
            href="/admin/login"
            size="lg"
          >
            Admin Login
          </Link>
        </NavbarMenuItem>

        {/* Font Size Selector for Mobile */}
        <NavbarMenuItem>
          <div className="w-full py-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Text Size
            </p>
            <ButtonGroup size="sm" variant="flat" className="w-full">
              <Button
                color={fontSize === "small" ? "primary" : "default"}
                onPress={() => changeFontSize("small")}
                className="flex-1"
              >
                Small
              </Button>
              <Button
                color={fontSize === "medium" ? "primary" : "default"}
                onPress={() => changeFontSize("medium")}
                className="flex-1"
              >
                Medium
              </Button>
              <Button
                color={fontSize === "large" ? "primary" : "default"}
                onPress={() => changeFontSize("large")}
                className="flex-1"
              >
                Large
              </Button>
            </ButtonGroup>
          </div>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
}

