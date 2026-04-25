import { Mockup } from "@/components/ui/Mockup";
import { Navbar } from "@/components/ui/Navbar";
import { Download, Play, Search, Calendar, Heart } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <main className="w-full flex-col flex overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 min-h-screen flex items-center justify-center">
        {/* Abstract Background Elements */}
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-(--primary)/15 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow"></div>
        <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] bg-(--tertiary)/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow-slow"></div>
        
        {/* Cinematic Floating Orbs */}
        <div className="absolute top-[30%] left-[10%] w-12 h-12 bg-(--primary)/30 rounded-full blur-xl animate-float-delayed pointer-events-none -z-5"></div>
        <div className="absolute top-[60%] right-[5%] w-8 h-8 bg-(--tertiary)/40 rounded-full blur-lg animate-float pointer-events-none -z-5"></div>
        <div className="absolute bottom-[10%] left-[40%] w-16 h-16 bg-(--primary)/20 rounded-full blur-2xl animate-float-delayed pointer-events-none -z-5" style={{ animationDuration: '8s' }}></div>
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-8 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low ghost-border">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">The Kinetic Canvas is Here</span>
            </div>
            <h1 className="font-epilogue text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tighter">
              The <span className="text-gradient">Ethereal</span> <br className="hidden lg:block"/> Archive.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-xl">
              Step into the midnight sky. Mugen breaks the grid with borderless transitions, luminous accents, and a cinematic viewing experience for your favorite anime.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <a
                href="https://tinyurl.com/mugenstream"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-linear-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-lg font-bold text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(186,158,255,0.3)]"
              >
                <Download className="w-5 h-5" /> Download on Google Play
              </a>
              <a
                href="https://tinyurl.com/mugenanimetester"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-4 rounded-lg font-semibold text-sm text-on-surface-variant ghost-border hover:text-primary hover:border-primary/40 transition-all"
              >
                Become a Tester
              </a>
            </div>
          </div>
          
          {/* Hero Device Right Side & Floating */}
          <div className="relative w-full h-[600px] md:h-[700px] flex items-center justify-center z-20 mt-8 lg:mt-0 perspective-1000">
            <div className="relative w-[280px] md:w-[320px] animate-float ambient-shadow transition-transform duration-700 hover:scale-105">
              <div className="absolute inset-x-0 -bottom-10 h-32 bg-linear-to-t from-(--surface) to-transparent z-30 pointer-events-none blur-[10px] opacity-70"></div>
              <Mockup src="/assets/home_page.jpg" alt="Mugen Home Screen" priority />
            </div>
          </div>
        </div>
      </section>

      {/* Cinematic Player Section (New) */}
      <section className="relative py-32 mt-20 px-6 bg-surface-container-lowest overflow-hidden">
        {/* Gradient Transition from prev section */}
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-(--surface) to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-[500px] bg-(--primary)/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto flex flex-col items-center gap-16 relative z-20">
          <div className="text-center max-w-3xl flex flex-col items-center gap-6">
            <h2 className="font-epilogue text-4xl md:text-6xl font-extrabold tracking-tight">
              A theater in <br/> your hands.
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed max-w-xl">
              Immersive, edge-to-edge landscape playback optimized for OLED displays. The interface disappears when you need it to, returning with a silky-smooth flourish automatically.
            </p>
          </div>

          <div className="w-full max-w-4xl relative group">
            {/* Ambient Background Glow for the Device */}
            <div className="absolute -inset-10 bg-linear-to-r from-primary/20 to-(--tertiary)/20 rounded-3xl blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10 transform group-hover:scale-[1.02] transition-transform duration-700 ease-out ambient-shadow animate-float-delayed">
              <Mockup src="/assets/video_playing.jpg" alt="Cinematic Landscape Player" landscape />
            </div>

            {/* Simulated UI Overlays on Hover */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center ghost-border text-white opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 z-20 group-hover:scale-110">
              <Play className="w-8 h-8 ml-1" />
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-surface-container-low to-transparent z-10 pointer-events-none"></div>
      </section>

      {/* Feature 1: Immersive Details */}
      <section id="features" className="relative py-24 md:py-32 px-6 bg-surface-container-low">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="order-2 md:order-1 flex justify-center w-full">
            <div className="w-[280px] md:w-[340px] relative animate-float">
              <div className="absolute -inset-10 bg-(--primary)/5 rounded-full blur-[80px]"></div>
              <Mockup src="/assets/anime_detail.jpg" alt="Anime Detail Screen" className="relative z-10" />
            </div>
          </div>
          
          <div className="order-1 md:order-2 flex flex-col items-start gap-6 w-full lg:max-w-md">
            <h2 className="font-epilogue text-4xl md:text-6xl font-extrabold tracking-tight">
              Cinematic <br/><span className="text-on-surface-variant">Immersion.</span>
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Every title is treated as high-art. The interface recedes, allowing key art to bleed into the deep dark canvas. Content layers intuitively using depth and ambient light instead of harsh borders.
            </p>
            
            <ul className="mt-6 flex flex-col gap-4">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Ghost Borders</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Containers implied by subtle 15% opacity shifts, never harsh lines.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-tertiary" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Episode Pulse</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Vibrant tertiary progress indicators cut through the abyss.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature 2: Discover & Track */}
      <section id="discover" className="relative py-32 md:py-48 px-6 bg-(--surface) overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-6 mb-20 z-10 relative">
          <h2 className="font-epilogue text-4xl md:text-6xl font-extrabold tracking-tight max-w-2xl">
            A limitless <span className="text-gradient">Archive</span> at your fingertips.
          </h2>
          <p className="text-on-surface-variant text-lg max-w-xl">
            From seasonal releases to niche classics, seamlessly chart your journey through the anime universe.
          </p>
        </div>

        <div className="max-w-6xl mx-auto w-full relative h-[600px] md:h-[700px] flex justify-center items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-(--primary)/5 rounded-full blur-[100px] pointer-events-none animate-pulse-glow"></div>

          {/* Center Device */}
          <div className="absolute z-30 w-[240px] md:w-[300px] transform hover:scale-105 transition-transform duration-500 ambient-shadow animate-float">
            <Mockup src="/assets/search_page.jpg" alt="Search Interface" />
          </div>
          
          {/* Left Device */}
          <div className="absolute z-20 w-[200px] md:w-[260px] translate-x-[-70%] md:translate-x-[-90%] translate-y-[10%] rotate-[-4deg] opacity-70 hover:opacity-100 hover:rotate-0 hover:z-40 transition-all duration-500 animate-float-delayed">
            <Mockup src="/assets/favorite_page.jpg" alt="Favorites/Watchlist" />
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Heart className="w-5 h-5 text-tertiary" /> <span className="font-bold tracking-wide text-sm whitespace-nowrap">Your List</span>
            </div>
          </div>

          {/* Right Device */}
          <div className="absolute z-20 w-[200px] md:w-[260px] translate-x-[70%] md:translate-x-[90%] translate-y-[5%] rotate-[4deg] opacity-70 hover:opacity-100 hover:rotate-0 hover:z-40 transition-all duration-500 animate-float" style={{ animationDelay: '1.5s' }}>
            <Mockup src="/assets/schedule_page.jpg" alt="Airing Schedule" />
            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> <span className="font-bold tracking-wide text-sm whitespace-nowrap">Schedule</span>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section id="download" className="relative py-24 px-6 mt-12 bg-linear-to-b from-(--surface) to-surface-container-lowest">
        <div className="max-w-5xl mx-auto glass-panel p-8 md:p-16 rounded-4xl md:rounded-[3rem] ghost-border flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[300px] h-[300px] bg-(--primary-container)/20 rounded-full blur-[80px]"></div>
          
          <div className="w-[200px] md:w-[260px] shrink-0 z-10 relative animate-float-delayed">
            <Mockup src="/assets/download_page.jpg" alt="Offline Downloads" />
            {/* Design detail: floating badge */}
            <div className="absolute top-10 -right-6 md:-right-10 bg-surface-container-high ghost-border px-4 py-3 rounded-2xl ambient-shadow flex items-center gap-3 animate-bounce shadow-[0_10px_30px_rgba(0,0,0,0.5)]" style={{ animationDuration: '3s' }}>
              <div className="w-8 h-8 rounded-full bg-(--primary)/20 flex items-center justify-center">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm">Offline</span>
                <span className="text-primary text-xs font-medium border border-(--primary)/30 rounded px-1 w-fit mt-0.5">1080p</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 z-10">
            <h2 className="font-epilogue text-4xl md:text-5xl font-black tracking-tighter">
              Take the Archive<br/>with you.
            </h2>
            <p className="text-on-surface-variant text-lg max-w-md leading-relaxed">
              Download entire seasons over Wi-Fi and watch in ultra-high fidelity wherever the journey takes you. No signals. No borders.
            </p>
            <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
              <a
                href="https://tinyurl.com/mugenstream"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-linear-to-br from-primary to-primary-container text-on-primary px-6 py-4 rounded-xl font-bold text-lg hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(186,158,255,0.2)]"
              >
                <Download className="w-5 h-5" /> Download on Google Play
              </a>
              <p className="text-xs text-on-surface-variant text-center">Available for Android 8.0+</p>
              <a
                href="https://tinyurl.com/mugenanimetester"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-on-surface-variant ghost-border hover:text-primary hover:border-primary/40 transition-all"
              >
                Become a Tester
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="w-full py-12 px-6 border-t border-[rgba(64,72,92,0.15)] bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/assets/logo.png" alt="Mugen Logo" width={24} height={24} className="rounded-full" />
            <span className="font-epilogue font-bold text-lg tracking-tight text-white">Mugen</span>
          </div>
          <p className="text-sm text-on-surface-variant flex items-center gap-1">
            Built with <Heart className="w-3 h-3 text-tertiary" /> using Next.js & Tailwind V4
          </p>
        </div>
      </footer>
    </main>
  );
}
