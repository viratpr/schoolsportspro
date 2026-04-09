'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FixedMarketingBackground } from '@/components/marketing/FixedMarketingBackground';
import { getApiBaseUrl } from '@/lib/api-base';

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const schema = z.object({
  schoolName: z.string().min(1, 'School name required').max(200),
  slug: z
    .string()
    .min(2, 'At least 2 characters')
    .max(50)
    .toLowerCase()
    .regex(slugRegex, 'Only lowercase letters, numbers, and hyphens'),
  adminName: z.string().min(1, 'Admin name required').max(200),
  adminEmail: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'At least one letter')
    .regex(/[0-9]/, 'At least one number'),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

const BILLING_CHECKOUT_KEY = 'billing_open_checkout';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const postSignupPlan =
    searchParams.get('plan') === 'ANNUAL_PRO' ? 'ANNUAL_PRO' : null;

  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
      setError('API is not configured.');
      return;
    }
    let res: Response;
    try {
      res = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: data.schoolName,
          slug: data.slug,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
          password: data.password,
          country: data.country || undefined,
          state: data.state || undefined,
          city: data.city || undefined,
        }),
      });
    } catch (e) {
      if (e instanceof TypeError) {
        setError(
          'Could not reach the server. Check your connection, or try again in a few minutes if our systems are busy.',
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      setError('The service is temporarily unavailable. Please try again in a few minutes.');
      return;
    }

    try {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : json.message || 'Signup failed');
        return;
      }
      const signInResult = await signIn('credentials', {
        email: data.adminEmail,
        password: data.password,
        redirect: false,
      });
      if (signInResult?.error) {
        router.push('/signup/success');
        return;
      }

      if (postSignupPlan === 'ANNUAL_PRO' && typeof window !== 'undefined') {
        sessionStorage.setItem(BILLING_CHECKOUT_KEY, 'ANNUAL_PRO');
      }

      if (postSignupPlan === 'ANNUAL_PRO') {
        router.replace('/app/billing');
        router.refresh();
        return;
      }

      router.push('/app/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong while completing signup. Please try again.');
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      <FixedMarketingBackground />
      <div className="relative z-10 w-full max-w-md flex flex-col gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline inline-flex items-center gap-1">
          ← Back to home
        </Link>
        <Card className="w-full bg-card/95 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle>Create your school account</CardTitle>
          <p className="text-sm text-muted-foreground">
            {postSignupPlan === 'ANNUAL_PRO'
              ? 'Start your free trial (no card). After you create your account, we will open secure Stripe checkout for Annual Pro.'
              : 'Start your free trial. No card required.'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="schoolName">School name</Label>
              <Input id="schoolName" {...register('schoolName')} className="mt-1" />
              {errors.schoolName && <p className="text-sm text-destructive mt-1">{errors.schoolName.message}</p>}
            </div>
            <div>
              <Label htmlFor="slug">School code (unique, e.g. my-school)</Label>
              <Input id="slug" {...register('slug')} placeholder="my-school" className="mt-1" />
              {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminName">Admin name</Label>
              <Input id="adminName" {...register('adminName')} className="mt-1" />
              {errors.adminName && <p className="text-sm text-destructive mt-1">{errors.adminName.message}</p>}
            </div>
            <div>
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input id="adminEmail" type="email" {...register('adminEmail')} className="mt-1" />
              {errors.adminEmail && <p className="text-sm text-destructive mt-1">{errors.adminEmail.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} className="mt-1" />
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">Create account</Button>
          </form>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Already have an account? <Link href="/login" className="underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground relative">
          <FixedMarketingBackground />
          <span className="relative z-10">Loading…</span>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
