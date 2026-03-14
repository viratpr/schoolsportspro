/**
 * This file defines the "Pricing" page for the Athletic Bharat marketing website.
 * 
 * Key Features:
 * - Sets the page metadata (title and description) for better SEO and social previews.
 * - Exports a functional React component (PricingPage) that renders a responsive pricing table.
 * - Utilizes Card-based UI to display three pricing options:
 *    1. Free Trial: No cost, limited to one month, with basic features.
 *    2. Tournament Pass: Paid (₹4,999 for 3 months), includes certificate generation and full tournament coverage.
 *    3. Annual Pro: Paid (₹9,999 for 12 months), highlighted as "Best value" with additional benefits such as a public live score URL, certificates, global ranking, and priority support.
 * - Each option uses clear headings, pricing, feature bullet points, and a call-to-action button that leads to the signup page.
 * - Layout is mobile-responsive, using utility classes to center the content and distribute pricing cards in a grid on larger screens.
 * - All UI primitives are imported from custom components, following the design system (shadcn/ui).
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Set page metadata for the Next.js app
export const metadata = {
  title: 'Pricing | Athletic Bharat',
  description: 'Free trial, Tournament Pass (3 months), and Annual Pro (12 months). Certificate generation, live score view, global ranking.',
};

// Main PricingPage React component
export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      {/* Page Heading */}
      <h1 className="text-3xl font-bold text-center mb-4">Pricing</h1>
      <p className="text-center text-muted-foreground max-w-xl mx-auto mb-12">
        Start with a free trial. No card required. Choose Tournament Pass or Annual Pro when you’re ready.
      </p>

      {/* Responsive pricing grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

        {/* Free Trial Card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Free Trial</h2>
            <p className="text-3xl font-bold mt-2">
              ₹0 <span className="text-sm font-normal text-muted-foreground">/ first month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Full access for 30 days</li>
              <li>• Up to 2 sports per competition</li>
              <li>• All scorecards and brackets</li>
              <li>• Unlimited categories and teams</li>
            </ul>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">Start free trial</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tournament Pass Card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Tournament Pass</h2>
            <p className="text-3xl font-bold mt-2">
              ₹4,999 <span className="text-sm font-normal text-muted-foreground">/ 3 months</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Everything in Free Trial</li>
              <li>• Certificate generation (school logo, print/PDF)</li>
              <li>• Full tournament season coverage</li>
              <li>• All scorecards and brackets</li>
            </ul>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">Get Tournament Pass</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Annual Pro Card - highlighted as best value */}
        <Card className="border-primary">
          <CardHeader>
            <p className="text-xs font-medium text-primary uppercase tracking-wide">Best value</p>
            <h2 className="text-xl font-semibold">Annual Pro</h2>
            <p className="text-3xl font-bold mt-2">
              ₹9,999 <span className="text-sm font-normal text-muted-foreground">/ 12 months</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li>• Everything in Tournament Pass</li>
              <li>• Public URL for live score view</li>
              <li>• Certificate generation</li>
              <li>• Global ranking</li>
              <li>• Priority support</li>
            </ul>
            <Link href="/signup" className="block">
              <Button className="w-full">Get Annual Pro</Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
