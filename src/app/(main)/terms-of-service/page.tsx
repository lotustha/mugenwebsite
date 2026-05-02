export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-4xl font-bold text-text-main mb-8 tracking-tight">
          Terms of Service
        </h1>

        <div className="prose prose-invert font-body text-text-main/80">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-text-main mt-8 mb-4">Acceptance of Terms</h2>
          <p>
            By accessing or using the Mugen Anime website and services, you agree to be bound
            by these Terms of Service.
          </p>

          <h2 className="text-text-main mt-8 mb-4">Description of Service</h2>
          <p>
            Mugen Anime provides a gateway to anime-related content and services.
            Our app is available on the Google Play Store and is designed to help you
            discover and explore anime content.
          </p>

          <h2 className="text-text-main mt-8 mb-4">User Responsibilities</h2>
          <p>
            You agree to use the service only for lawful purposes and in accordance with
            these Terms. You are responsible for maintaining the confidentiality of your
            account information if applicable.
          </p>

          <h2 className="text-text-main mt-8 mb-4">Limitation of Liability</h2>
          <p>
            Mugen Anime shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages resulting from your use of the service.
          </p>

          <h2 className="text-text-main mt-8 mb-4">Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at support@mugenanime.com
          </p>
        </div>
      </div>
    </div>
  );
}