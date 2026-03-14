'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      Logout
    </Button>
  );
}
