"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Navbar() {
  const [activeSection, setActiveSection] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = ["features", "discover", "download"];
      const scrollPosition = window.scrollY + 200; // offset for triggering

      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    // Call once to set initial state
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 px-6 py-4 transition-all duration-300 ${scrolled ? 'py-3' : 'py-6'}`}>
      <div className={`max-w-7xl mx-auto flex items-center justify-between transition-all duration-500 px-6 py-3 rounded-2xl ghost-border ${scrolled ? 'glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.3)]' : 'bg-transparent border-transparent'}`}>
        <a href="#" className="flex items-center gap-3">
          <Image src="/assets/logo.png" alt="Mugen Logo" width={32} height={32} className="rounded-full" />
          <span className="font-epilogue font-bold text-xl tracking-tight text-white">Mugen</span>
        </a>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#features"
            className={`transition-colors ${
              activeSection === "features" ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
            }`}
          >
            Features
          </a>
          <a
            href="#discover"
            className={`transition-colors ${
              activeSection === "discover" ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
            }`}
          >
            Discover
          </a>
          <a
            href="#download"
            className={`transition-colors ${
              activeSection === "download" ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
            }`}
          >
            Download
          </a>
        </div>
        <a 
          href="#download" 
          className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] px-5 py-2 rounded-lg font-semibold text-sm hover:brightness-110 active:scale-95 transition-all outline-none shadow-[0_0_15px_rgba(186,158,255,0.2)]"
        >
          Get the App
        </a>
      </div>
    </nav>
  );
}
