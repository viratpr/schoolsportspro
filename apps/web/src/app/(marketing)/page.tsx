import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Athletic Bharat — School Sports Tournament Management',
  description: 'Run brackets, scorecards, and results for your school sports events. One month free trial.',
  openGraph: { title: 'Athletic Bharat — School Sports Tournament Management', description: 'Run brackets, scorecards, and results for your school sports events.' },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role === 'PLATFORM_ADMIN') redirect('/platform/tenants');
    redirect('/app/dashboard');
  }
  return (
    <div>
      <section className="container mx-auto px-4 py-20 md:py-28 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
          Run your school sports tournaments with confidence
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Brackets, scorecards, and results in one place. One month free trial — no card required.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Start free trial
            </Button>
          </Link>
          <Link href="/contact">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Book a demo
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">1. Create your competition</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add sports, categories, and teams. Generate knockout brackets or use leaderboards for individual events.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">2. Enter scores</p>
              <p className="text-sm text-muted-foreground mt-2">
                Use sport-specific scorecards and optional player stats. Save drafts and finalize when ready.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">3. Publish results</p>
              <p className="text-sm text-muted-foreground mt-2">
                Winners advance automatically. View brackets and leaderboards. Export or share with your school.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">4. Certificate generation</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate certificates from leaderboards with your school logo and Athletic Bharat branding. Configurable signature lines. Print or download as PDF.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">5. Public live view link</p>
              <p className="text-sm text-muted-foreground mt-2">
                Share a read-only link so anyone can view brackets and results without logging in. Enable, copy, or disable from the competition page.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-10">Sports supported</h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Cricket, Football, Basketball, Kabaddi, Volleyball, Kho-Kho, Badminton, Chess, Athletics (100m, Long Jump, Shot Put), and more. Team and individual formats with flexible scoring.
        </p>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-10">Scorecards & brackets</h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Template-driven scorecards for every sport. Knockout brackets with automatic advancement. Leaderboards for individual events. All data stays in your tenant — secure and private.
        </p>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-10">Security</h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Multi-tenant isolation, role-based access (Admin, Coordinator, Coach, Viewer), and audit trails. Your school data is never mixed with others.
        </p>
      </section>

      <section className="container mx-auto px-4 py-16 border-t">
        <h2 className="text-2xl font-semibold text-center mb-10">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold">Free Trial</h3>
              <p className="text-2xl font-bold mt-2">₹0 <span className="text-sm font-normal text-muted-foreground">/ first month</span></p>
              <p className="text-sm text-muted-foreground mt-2">Up to 2 sports per competition. No card required.</p>
              <Link href="/signup" className="inline-block mt-4">
                <Button variant="outline" className="w-full">Start free trial</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold">Tournament Pass</h3>
              <p className="text-2xl font-bold mt-2">₹4,999 <span className="text-sm font-normal text-muted-foreground">/ 3 months</span></p>
              <p className="text-sm text-muted-foreground mt-2">Certificate generation, scorecards, brackets. Ideal for a full tournament season.</p>
              <Link href="/signup" className="inline-block mt-4">
                <Button variant="outline" className="w-full">Get Tournament Pass</Button>
              </Link>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold">Annual Pro</h3>
              <p className="text-2xl font-bold mt-2">₹9,999 <span className="text-sm font-normal text-muted-foreground">/ 12 months</span></p>
              <p className="text-sm text-muted-foreground mt-2">Public URL for live score view, Certificate generation, global ranking. Best value.</p>
              <Link href="/signup" className="inline-block mt-4">
                <Button className="w-full">Get Annual Pro</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <p className="text-center mt-6">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground underline">View full pricing</Link>
        </p>
      </section>

      <section className="container mx-auto px-4 py-20 border-t text-center">
        <h2 className="text-2xl font-semibold">Ready to get started?</h2>
        <p className="mt-2 text-muted-foreground">Start your free trial in under a minute.</p>
        <Link href="/signup" className="inline-block mt-6">
          <Button size="lg">Start free trial</Button>
        </Link>
      </section>
    </div>
  );
}
