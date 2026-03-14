'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VideoBackground from '@/components/login/VideoBackground';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    setDevResetLink(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong. Try again.');
      return;
    }
    setSent(true);
    if (json.resetLink) setDevResetLink(json.resetLink);
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-start overflow-hidden">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-md ml-[8%] lg:ml-[12%] px-4 py-8">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Forgot password</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  If an account exists for that email, you will receive a reset link. Check your inbox and spam folder.
                </p>
                {devResetLink && (
                  <p className="text-xs text-muted-foreground break-all">
                    Dev: <a href={devResetLink} className="underline text-foreground">Reset link</a>
                  </p>
                )}
                <Link href="/login">
                  <Button variant="outline" className="w-full">Back to sign in</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} className="mt-1" placeholder="you@school.com" />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">Send reset link</Button>
                <p className="text-center">
                  <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
