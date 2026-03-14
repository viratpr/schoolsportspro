export const metadata = {
  title: 'Terms of Service | Athletic Bharat',
  description: 'Terms of service for Athletic Bharat.',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 2025</p>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          By using Athletic Bharat, you agree to use the service only for lawful purposes and in accordance with these terms. You are responsible for maintaining the security of your account and for all activity under your account.
        </p>
        <p>
          The service is provided &quot;as is&quot;. We do not guarantee uninterrupted or error-free operation. We may update or discontinue features with reasonable notice where practical.
        </p>
        <p>
          Subscription terms (trial, Pro, billing) are as described on the pricing page and in your account. Cancellation and refunds are handled according to our billing policy and applicable law.
        </p>
        <p>
          For questions, contact support@athleticbharat.com.
        </p>
      </div>
    </div>
  );
}
