import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MugenAnime",
  description:
    "How MugenAnime and the Mugen Pro mobile app collect, use, and protect your data.",
};

const UPDATED = "June 27, 2026";
const SUPPORT = "support@mugenanime.com";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-4xl font-bold text-text-main mb-2 tracking-tight">
          Privacy Policy
        </h1>
        <p className="font-body text-sm text-text-main/40 mb-10">
          Last updated: {UPDATED}
        </p>

        <div className="prose prose-invert font-body text-text-main/80 max-w-none leading-relaxed">
          <p>
            This Privacy Policy explains how MugenAnime (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;) handles information across the MugenAnime website and
            the <strong>Mugen Pro</strong> Android application (package{" "}
            <code>com.mugenstream.pro</code>, collectively the
            &ldquo;Services&rdquo;). By using the Services you agree to the
            practices described here.

          </p>

          <h2 className="text-text-main mt-10 mb-4">Summary</h2>
          <ul>
            <li>The Mugen Pro app does <strong>not</strong> require an account and does not ask for your name, email, or phone number.</li>
            <li>Your favorites, watch history, and settings are stored <strong>only on your device</strong>.</li>
            <li>We use Google Firebase (push notifications, remote configuration) and Google AdMob (ads). These services may collect device identifiers as described below.</li>
            <li>We do not sell your personal information.</li>
          </ul>

          <h2 className="text-text-main mt-10 mb-4">Information We Collect</h2>

          <h3 className="text-text-main mt-6 mb-2">a. Information stored on your device only</h3>
          <p>
            The app keeps your favorites, continue-watching history, playback
            preferences (sub/dub, episode order), and notification settings in
            local storage on your device. This data is not transmitted to us and
            is removed when you clear the app&rsquo;s data or uninstall it.
          </p>

          <h3 className="text-text-main mt-6 mb-2">b. Push notifications (Firebase Cloud Messaging)</h3>
          <p>
            To deliver alerts for new episodes, wallpapers, and news, Firebase
            Cloud Messaging assigns your installation a device registration
            token. We use this token only to send the notifications you have
            enabled. You can turn notifications off at any time in{" "}
            <em>Settings &rsaquo; Notifications</em> or in your device settings.
          </p>

          <h3 className="text-text-main mt-6 mb-2">c. Advertising (Google AdMob)</h3>
          <p>
            The app shows ads through Google AdMob. To serve and measure ads,
            Google and its partners may access your device&rsquo;s{" "}
            <strong>Advertising ID (AAID)</strong>, IP address, and general
            ad-interaction data, and may use them for personalized advertising.
            You can reset or delete your Advertising ID, or opt out of ad
            personalization, in your device&rsquo;s{" "}
            <em>Settings &rsaquo; Google &rsaquo; Ads</em>. See{" "}
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
              Google&rsquo;s advertising policy
            </a>{" "}
            for details.
          </p>

          <h3 className="text-text-main mt-6 mb-2">d. App configuration &amp; diagnostics (Firebase)</h3>
          <p>
            We use Firebase Remote Config and Firebase In-App Messaging to
            configure features and show in-app messages. These services use a
            Firebase installation identifier to deliver configuration and
            messages. We do not use this identifier to personally identify you.
          </p>

          <h3 className="text-text-main mt-6 mb-2">e. Website</h3>
          <p>
            On the MugenAnime website, we collect your email address only if you
            voluntarily subscribe to our newsletter or submit a support request,
            and standard server logs (such as IP address and browser type) used
            to operate and secure the site.
          </p>

          <h2 className="text-text-main mt-10 mb-4">How We Use Information</h2>
          <ul>
            <li>To provide and maintain the Services and your saved preferences.</li>
            <li>To send the notifications you have opted into.</li>
            <li>To display and measure advertising that helps keep the app free.</li>
            <li>To respond to support requests and newsletter sign-ups (website).</li>
            <li>To detect, prevent, and address abuse or technical issues.</li>
          </ul>

          <h2 className="text-text-main mt-10 mb-4">Sharing &amp; Third-Party Services</h2>
          <p>
            We do not sell or rent your personal information. Data is processed by
            the third-party providers that power the Services, each under its own
            privacy policy:
          </p>
          <ul>
            <li>
              <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Google Firebase</a>{" "}
              (push notifications, remote configuration, in-app messaging)
            </li>
            <li>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google AdMob</a>{" "}
              (advertising)
            </li>
          </ul>

          <h2 className="text-text-main mt-10 mb-4">Streaming Content</h2>
          <p>
            Mugen Pro is a discovery and player interface. Video is streamed from
            third-party sources and embedded players; we do not host the media.
            Those sources operate under their own terms and privacy policies.
          </p>

          <h2 className="text-text-main mt-10 mb-4">Your Choices</h2>
          <ul>
            <li>Turn notifications on or off in <em>Settings &rsaquo; Notifications</em> or your device settings.</li>
            <li>Reset or delete your Advertising ID, or opt out of personalized ads, in your device settings.</li>
            <li>Clear your favorites and watch history from within the app, or by clearing the app&rsquo;s data.</li>
            <li>Unsubscribe from the newsletter using the link in any email.</li>
          </ul>

          <h2 className="text-text-main mt-10 mb-4">Data Retention &amp; Security</h2>
          <p>
            On-device data persists until you clear it. Device tokens and
            newsletter records are retained only as long as needed for the
            purposes above. We use reasonable safeguards to protect information,
            though no method of transmission or storage is completely secure.
          </p>

          <h2 className="text-text-main mt-10 mb-4">Children&rsquo;s Privacy</h2>
          <p>
            The Services are not directed to children under 13, and we do not
            knowingly collect personal information from them. If you believe a
            child has provided us information, contact us and we will delete it.
          </p>

          <h2 className="text-text-main mt-10 mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes
            will be reflected by the &ldquo;Last updated&rdquo; date above.
          </p>

          <h2 className="text-text-main mt-10 mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or your data,
            contact us at{" "}
            <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
