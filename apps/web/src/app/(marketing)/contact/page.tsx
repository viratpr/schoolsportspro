'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '';
    if (!email.trim()) {
      setEmailError('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. name@school.com).');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 500);
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-4">Contact</h1>
      <p className="text-center text-muted-foreground mb-8">
        Request a demo or get in touch.
      </p>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Book a demo</h2>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-sm text-muted-foreground">
              Thanks for your interest. We’ll be in touch soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (!v.trim()) setEmailError(null);
                    else setEmailError(isValidEmail(v) ? null : 'Please enter a valid email address (e.g. name@school.com).');
                  }}
                  onChange={() => emailError && setEmailError(null)}
                />
                {emailError && (
                  <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="school">School name</Label>
                <Input id="school" name="school" className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Request Demo'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Or email us at{' '}
        <a href="mailto:support@schoolsportspro.com" className="underline hover:text-foreground">
          support@schoolsportspro.com
        </a>
      </p>
    </div>
  );
}
