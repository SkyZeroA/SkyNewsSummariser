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
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>("");

  // Initialize with default value to avoid hydration mismatch
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      // Important: include cookies in request
      const response = await fetch("/api/auth/verify", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setIsLoggedIn(true);
          setUserName(data.user.name || "");
        } else {
          setIsLoggedIn(false);
          setUserName("");
        }
      } else {
        setIsLoggedIn(false);
        setUserName("");
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setIsLoggedIn(false);
      setUserName("");
    }
  };

  // Sync with localStorage and DOM after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Sync dark mode from DOM (set by blocking script in layout)
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }

    // Sync font size from localStorage
    if (typeof localStorage !== "undefined") {
      const savedFontSize = localStorage.getItem("fontSize") as
        | "small"
        | "medium"
        | "large"
        | null;
      if (savedFontSize) {
        setFontSize(savedFontSize);
      }
    }

    // Check authentication status
    checkAuthStatus();

    // Listen for auth changes (login/logout events)
    const handleAuthChange = () => {
      checkAuthStatus();
    };

    globalThis.addEventListener("auth-change", handleAuthChange);
    return () => globalThis.removeEventListener("auth-change", handleAuthChange);
  }, []);

  // Apply dark mode when it changes (but not on initial mount since blocking script handles that)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDarkMode);
    }
  }, [isDarkMode]);

  // Apply font size when it changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      applyFontSize(fontSize);
    }
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

  // Handle logout
  const handleLogout = async () => {
    try {
      // Important: include cookies in request
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        setIsLoggedIn(false);
        setUserName("");
        router.push("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Navbar
      isBordered
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      className="bg-white dark:bg-gray-900 animate-fadeIn"
      maxWidth="xl"
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden text-gray-900 dark:text-gray-100 transition-transform duration-300 hover:scale-110"
        />
        <NavbarBrand>
          <Link href="/" className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-all duration-300 hover:scale-105 cursor-pointer">
            Sky News Summariser
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex animate-fadeIn" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <ButtonGroup size="sm" variant="flat">
            <Button
              color={fontSize === "small" ? "primary" : "default"}
              onPress={() => changeFontSize("small")}
              className="min-w-unit-8 px-2 transition-all duration-300 hover:scale-110"
            >
              <span className="text-xs !text-xs">A</span>
            </Button>
            <Button
              color={fontSize === "medium" ? "primary" : "default"}
              onPress={() => changeFontSize("medium")}
              className="min-w-unit-10 px-2 transition-all duration-300 hover:scale-110"
            >
              <span className="text-sm !text-sm">A</span>
            </Button>
            <Button
              color={fontSize === "large" ? "primary" : "default"}
              onPress={() => changeFontSize("large")}
              className="min-w-unit-12 px-2 transition-all duration-300 hover:scale-110"
            >
              <span className="text-base !text-base">A</span>
            </Button>
          </ButtonGroup>
        </NavbarItem>
        <NavbarItem className="animate-fadeIn" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          {mounted && (
            <Switch
              isSelected={isDarkMode}
              onValueChange={toggleDarkMode}
              size="sm"
              color="primary"
              startContent={<span className="text-xs">☀️</span>}
              endContent={<span className="text-xs">🌙</span>}
              aria-label="Toggle dark mode"
              className="transition-all duration-300 hover:scale-105"
            />
          )}
        </NavbarItem>
        <NavbarItem className="animate-fadeIn" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          {mounted && (
            isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Welcome, <span className="font-semibold">{userName}</span>
                </span>
                <Button
                  color="danger"
                  variant="flat"
                  size="sm"
                  onPress={handleLogout}
                  className="transition-all duration-300 hover:scale-105"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/login" className="text-sm transition-all duration-300 hover:scale-105">
                Admin Login
              </Link>
            )
          )}
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu>
        {/* Admin Login/Logout for Mobile */}
        {isLoggedIn && (
          <NavbarMenuItem>
            <div className="w-full py-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Logged in as
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {userName}
              </p>
            </div>
          </NavbarMenuItem>
        )}
        <NavbarMenuItem>
          {isLoggedIn ? (
            <Button
              className="w-full"
              color="danger"
              variant="flat"
              size="lg"
              onPress={handleLogout}
            >
              Logout
            </Button>
          ) : (
            <Link
              className="w-full"
              color="primary"
              href="/login"
              size="lg"
            >
              Admin Login
            </Link>
          )}
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

