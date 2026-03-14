'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
                <Input id="email" name="email" type="email" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="school">School name</Label>
                <Input id="school" name="school" className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send request'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Or email us at{' '}
        <a href="mailto:support@athleticbharat.com" className="underline hover:text-foreground">
          support@athleticbharat.com
        </a>
      </p>
    </div>
  );
}
