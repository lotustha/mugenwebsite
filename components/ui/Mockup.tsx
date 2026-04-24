import Image from "next/image";

interface MockupProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  landscape?: boolean;
}

export function Mockup({ src, alt, className = "", priority = false, landscape = false }: MockupProps) {
  return (
    <div className={`relative mx-auto border-[8px] border-[var(--surface-container-highest)] rounded-[3rem] shadow-[0px_24px_48px_rgba(0,0,0,0.6)] ${className} ${landscape ? 'aspect-[19.5/9]' : 'aspect-[9/19.5]'}`}>
      <div className="rounded-[2.5rem] overflow-hidden w-full h-full relative ghost-border bg-[var(--surface-container-lowest)]">
        {/* Notch/Dynamic Island approximation */}
        {landscape ? (
          <div className="absolute top-0 bottom-0 left-0 w-6 flex items-center z-20">
             <div className="h-1/3 w-5 bg-[var(--surface-container-highest)] rounded-r-xl"></div>
          </div>
        ) : (
          <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
            <div className="w-1/3 h-5 bg-[var(--surface-container-highest)] rounded-b-xl"></div>
          </div>
        )}
        
        {/* The screenshot */}
        <div className="relative w-full h-full">
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes={landscape ? "(max-width: 768px) 100vw, 80vw" : "(max-width: 768px) 100vw, 50vw"}
            priority={priority}
          />
        </div>
        
        {/* Optional: Glossy reflection effect for Glassmorphism */}
        <div className="absolute inset-0 pointer-events-none rounded-[2.5rem] bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.1] mix-blend-overlay"></div>
      </div>
    </div>
  );
}
