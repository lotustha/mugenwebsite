export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-4xl font-bold text-text-main mb-8 tracking-tight">
          Privacy Policy
        </h1>

        <div className="prose prose-invert font-body text-text-main/80">
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-text-main mt-8 mb-4">Information We Collect</h2>
          <p>
            We collect information you provide directly to us, including your email address
            when you subscribe to our newsletter or submit a support request.
          </p>

          <h2 className="text-text-main mt-8 mb-4">How We Use Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services,
            to communicate with you about anime updates and news, and to respond to your inquiries.
          </p>

          <h2 className="text-text-main mt-8 mb-4">Information Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information
            to outside parties unless we provide users with advance notice.
          </p>

          <h2 className="text-text-main mt-8 mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support@mugenanime.com
          </p>
        </div>
      </div>
    </div>
  );
}