import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FixedMarketingBackground } from '@/components/marketing/FixedMarketingBackground';

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      <FixedMarketingBackground />
      <Card className="relative z-10 w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Account created</CardTitle>
          <p className="text-muted-foreground">
            Your school account is ready. Your free trial has started — you can enable up to 2 sports per competition. Upgrade to Pro anytime for unlimited sports.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link href="/app/dashboard">
            <Button className="w-full">Go to dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">Sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
