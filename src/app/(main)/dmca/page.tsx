import GlassCard from "@/components/GlassCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Takedown Policy — Mugen Anime",
  description: "Mugen Anime DMCA notice and takedown procedure.",
};

export default function DMCAPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-4xl font-bold text-text-main mb-8 tracking-tight">
          DMCA Takedown Policy
        </h1>

        <GlassCard className="mb-8">
          <h2 className="font-headline text-xl font-semibold text-text-main mb-4">Overview</h2>
          <p className="font-body text-text-main/80 leading-relaxed">
            Mugen Anime respects the intellectual property rights of others and expects our users
            to do the same. In accordance with the Digital Millennium Copyright Act of 1998
            (&ldquo;DMCA&rdquo;), we will respond promptly to claims of copyright infringement
            that are reported to our designated copyright agent.
          </p>
        </GlassCard>

        <GlassCard className="mb-8">
          <h2 className="font-headline text-xl font-semibold text-text-main mb-4">
            Filing a DMCA Notice
          </h2>
          <p className="font-body text-text-main/80 leading-relaxed mb-4">
            If you believe that content available on or through our website infringes your
            copyright, please send a written notice containing the following information to
            our designated agent:
          </p>
          <ol className="list-decimal list-inside space-y-3 font-body text-text-main/80">
            <li>A physical or electronic signature of the copyright owner or an authorized agent.</li>
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>
              Identification of the material that is claimed to be infringing, with enough detail
              to allow us to locate it on our website.
            </li>
            <li>
              Your contact information including address, telephone number, and email address.
            </li>
            <li>
              A statement that you have a good faith belief that the use of the material is not
              authorized by the copyright owner, its agent, or the law.
            </li>
            <li>
              A statement that the information in the notification is accurate, and under penalty
              of perjury, that you are the copyright owner or are authorized to act on behalf of
              the copyright owner.
            </li>
          </ol>
        </GlassCard>

        <GlassCard className="mb-8">
          <h2 className="font-headline text-xl font-semibold text-text-main mb-4">
            Counter-Notice
          </h2>
          <p className="font-body text-text-main/80 leading-relaxed">
            If content you posted was removed due to a DMCA notice and you believe the removal
            was a mistake or misidentification, you may submit a counter-notice. We will forward
            your counter-notice to the original complainant and reinstate the content if no
            court action is filed within 10 business days.
          </p>
        </GlassCard>

        <GlassCard>
          <h2 className="font-headline text-xl font-semibold text-text-main mb-4">Contact</h2>
          <p className="font-body text-text-main/80 leading-relaxed">
            Send DMCA notices to:{" "}
            <a
              href="mailto:dmca@mugenanime.com"
              className="text-primary hover:text-primary-dim transition-colors"
            >
              dmca@mugenanime.com
            </a>
          </p>
          <p className="font-body text-text-main/60 text-sm mt-4">
            We aim to respond to all valid DMCA takedown requests within 48 hours.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
