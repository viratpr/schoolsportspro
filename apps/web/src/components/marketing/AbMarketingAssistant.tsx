'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  getAbReply,
  SUPPORT_EMAIL,
  WELCOME_MESSAGE,
} from '@/components/marketing/abAssistantKnowledge';

type Role = 'assistant' | 'user';

type ChatMessage = { id: string; role: Role; text: string };

let idSeq = 0;
function nextId(): string {
  idSeq += 1;
  return `assistant-msg-${idSeq}`;
}

export function AbMarketingAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: nextId(), role: 'assistant', text: WELCOME_MESSAGE },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  function sendText(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text },
      { id: nextId(), role: 'assistant', text: getAbReply(text) },
    ]);
    setInput('');
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendText(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <div
        className="flex flex-col items-end gap-3 pointer-events-auto"
        aria-live="polite"
      >
        {open && (
          <Card
            id="ssp-marketing-assistant-panel"
            className="w-[min(100vw-2rem,22rem)] max-h-[min(70vh,32rem)] shadow-lg border bg-background/95 backdrop-blur-sm flex flex-col"
          >
            <CardHeader className="p-4 pb-2 space-y-0 shrink-0 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">SSP</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  SchoolSportsPro assistant
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 -mr-2 -mt-1"
                aria-label="Close SchoolSportsPro assistant"
                onClick={() => setOpen(false)}
              >
                <span aria-hidden className="text-lg leading-none">
                  ×
                </span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex flex-col flex-1 min-h-0 gap-3">
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[8rem] max-h-[min(38vh,16rem)]"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === 'assistant'
                        ? 'rounded-lg bg-muted/80 px-3 py-2 text-sm'
                        : 'rounded-lg border px-3 py-2 text-sm ml-6'
                    }
                  >
                    {m.role === 'assistant' && (
                      <span className="text-xs font-semibold text-muted-foreground block mb-1">
                        SSP
                      </span>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href="/pricing">Pricing</Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href="/features">Features</Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href="/signup">Start free trial</Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href="/contact">Book a demo</Link>
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <a href={`mailto:${SUPPORT_EMAIL}`}>Email support</a>
                </Button>
              </div>

              <form onSubmit={onSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask something…"
                  aria-label="Message to assistant"
                  className="text-sm"
                  autoComplete="off"
                />
                <Button type="submit" className="shrink-0">
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Button
          type="button"
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg p-0 font-semibold pointer-events-auto"
          aria-expanded={open}
          aria-controls="ssp-marketing-assistant-panel"
          aria-label={open ? 'Close SchoolSportsPro assistant' : 'Open SchoolSportsPro assistant'}
          onClick={() => setOpen((v) => !v)}
        >
          SSP
        </Button>
      </div>
    </div>
  );
}
