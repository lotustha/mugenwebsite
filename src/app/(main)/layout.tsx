import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { SocialProvider } from "@/components/social/SocialProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocialProvider>
      {/* Top navbar — desktop only */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* pt-24 only on desktop (floating navbar); mobile has no top nav */}
      <main className="flex-1 pt-0 md:pt-24 pb-20 md:pb-0">
        {children}
      </main>

      <Footer />

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </SocialProvider>
  );
}
