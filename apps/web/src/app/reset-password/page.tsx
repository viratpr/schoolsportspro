'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VideoBackground from '@/components/login/VideoBackground';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    if (!token) {
      setError('Invalid reset link. Request a new one from the forgot password page.');
      return;
    }
    setError(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: data.newPassword }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Failed to reset password. The link may have expired.');
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Reset password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Invalid or missing reset link. Please request a new one.</p>
          <Link href="/forgot-password">
            <Button className="w-full">Request reset link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Password reset</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your password has been updated. Redirecting to sign in...</p>
          <Link href="/login" className="mt-4 inline-block">
            <Button variant="outline">Sign in</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Set new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" {...register('newPassword')} className="mt-1" autoComplete="new-password" />
            {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} className="mt-1" autoComplete="new-password" />
            {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Reset password</Button>
          <p className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-start overflow-hidden">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-md ml-[8%] lg:ml-[12%] px-4 py-8">
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
