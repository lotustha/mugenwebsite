"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        setSubscribed(true);
        setEmail("");
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <footer className="bg-surface-low">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-headline text-xl font-bold text-primary mb-4">Mugen Anime</h3>
            <p className="font-body text-text-main/70 text-sm">
              Your gateway to the world of anime. Download our app for the best anime experience.
            </p>
          </div>
          
          <div>
            <h4 className="font-headline text-lg font-semibold text-text-main mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/news" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link href="/support" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/apps" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  Our Apps
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  DMCA
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="font-body text-text-main/70 hover:text-primary text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-headline text-lg font-semibold text-text-main mb-4">Stay Updated</h4>
            <p className="font-body text-text-main/70 text-sm mb-4">
              Subscribe to get the latest anime updates and news.
            </p>
            {subscribed ? (
              <p className="font-body text-primary text-sm">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 bg-surface border border-outline-variant/15 rounded font-body text-text-main placeholder:text-text-main/40 focus:outline-none focus:border-primary/50"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-dim text-surface font-body font-semibold rounded transition-colors"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-outline-variant/10">
          <p className="font-body text-center text-text-main/50 text-sm">
            © {new Date().getFullYear()} Mugen Anime. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
