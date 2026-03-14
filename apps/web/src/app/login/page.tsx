'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
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
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/app/dashboard';
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (res?.error) {
      const isServerError =
        res.error.includes('Auth server unreachable') ||
        res.error.includes('did not respond in time');
      setError(isServerError ? res.error : 'Invalid email or password');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} className="mt-1" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mt-1">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" {...register('password')} className="mt-1" />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-start overflow-hidden">
      <VideoBackground />
      {/* Form on the left */}
      <div className="relative z-10 w-full max-w-md ml-[8%] lg:ml-[12%] px-4 py-8">
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
