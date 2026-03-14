import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
  title: 'Features | Athletic Bharat',
  description: 'Sports tournament management: brackets, scorecards, multi-sport support.',
};

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-4">Features</h1>
      <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
        Everything you need to run annual school sports events.
      </p>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Multi-sport scorecards</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Football, Cricket, Basketball, Volleyball, Kabaddi, and more. Each sport has the right scorecard and optional player stats.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Knockout brackets</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Generate brackets from your categories and teams. Winners advance automatically.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Individual leaderboards</h2>
            <p className="text-sm text-muted-foreground mt-2">
              For athletics and individual events: participants, times or distances, auto-rank, and results.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Roles and security</h2>
            <p className="text-sm text-muted-foreground mt-2">
              School Admin, Coordinator, Coach, Viewer. Multi-tenant isolation and audit logs.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Certificate generation</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Generate certificates from category leaderboards with your school logo and Athletic Bharat branding. Configurable signature lines (e.g. Principal, Sports Teacher). Print or download as PDF.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="font-semibold">Public live view link</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Share a read-only link for a competition so anyone can view brackets, matches, and results without logging in. Enable, copy, or disable the link from the competition page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
