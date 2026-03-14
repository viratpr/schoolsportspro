'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

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

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
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
      router.push('/app/dashboard');
      router.refresh();
    } catch (e) {
      setError('Network error. Is the API running?');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your school account</CardTitle>
          <p className="text-sm text-muted-foreground">Start your free trial. No card required.</p>
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
  );
}
