import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
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
