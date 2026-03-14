export const metadata = {
  title: 'Privacy Policy | Athletic Bharat',
  description: 'Privacy policy for Athletic Bharat.',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: 2025</p>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          Athletic Bharat (&quot;we&quot;) collects and uses information necessary to provide our school sports tournament management service. We store school and user account data (name, email, school details) and tournament data (competitions, teams, scores, results) in a multi-tenant system where each school’s data is isolated.
        </p>
        <p>
          We do not sell your data. We use it to operate the product, improve our services, and communicate with you about your account. We may use cookies and similar technologies for authentication and session management.
        </p>
        <p>
          Data is stored securely and accessed only as needed to provide the service. You may request access to or deletion of your data by contacting us at support@athleticbharat.com.
        </p>
      </div>
    </div>
  );
}
