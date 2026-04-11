/** Facts aligned with marketing pages (features, pricing). */

import { formatPlanPriceLabel } from '@/lib/billing-pricing';

export const SUPPORT_EMAIL = 'support@schoolsportspro.com';

export const WELCOME_MESSAGE = `Hi - I'm SSP, your guide for SchoolSportsPro. I can explain trials, pricing, features, or point you to a demo. Use the buttons below or ask me anything in plain language.`;

export const FALLBACK_MESSAGE = `I don’t have a specific answer for that yet. Try the quick actions below, visit our Contact page to book a demo, or email ${SUPPORT_EMAIL} — we’re happy to help.`;

type Rule = { keywords: string[]; reply: string };

const RULES: Rule[] = [
  {
    keywords: ['forgot', 'password', 'reset'],
    reply:
      'You can reset your password from the login page. Open Sign in, then use “Forgot password” and check your email for the link.',
  },
  {
    keywords: ['login', 'sign in', 'signin'],
    reply: 'Use Sign in at the top of the site, or go to /login. You’ll need the email and password your school admin created for you.',
  },
  {
    keywords: ['signup', 'sign up', 'register', 'account', 'start'],
    reply:
      'You can start a one-month free trial with no card required — full access, up to 2 sports per competition. Use “Start free trial” or visit /signup.',
  },
  {
    keywords: ['trial', 'free'],
    reply:
      'The free trial runs 30 days with full access: brackets, scorecards, unlimited categories and teams, up to 2 sports per competition. No card needed.',
  },
  {
    keywords: ['price', 'pricing', 'cost', 'pay', 'usd', 'dollar', 'plan', 'tax'],
    reply:
      'Free trial: $0 for the first month. Paid plans are billed in USD through Stripe: Tournament Pass ' +
      formatPlanPriceLabel('TOURNAMENT_PASS') +
      ' for 3 months; Annual Pro ' +
      formatPlanPriceLabel('ANNUAL_PRO') +
      ' for 12 months (best value: live score URL, certificates, global ranking, priority support). See /pricing.',
  },
  {
    keywords: ['demo', 'book', 'sales', 'talk', 'call'],
    reply:
      'We’d love to show you around. Use “Book a demo” to open our contact form, or email us at ' +
      SUPPORT_EMAIL +
      '.',
  },
  {
    keywords: ['contact', 'email', 'reach', 'support', 'help'],
    reply: `For demos and questions, use the Contact page or write to ${SUPPORT_EMAIL}.`,
  },
  {
    keywords: ['sport', 'sports', 'soccer', 'football', 'baseball', 'basketball', 'volleyball', 'wrestling'],
    reply:
      'We support multi-sport events — soccer, baseball, basketball, volleyball, wrestling, track & field, and more — each with the right scorecard and optional player stats.',
  },
  {
    keywords: ['bracket', 'knockout', 'elimination'],
    reply:
      'You can generate knockout brackets from categories and teams, and winners advance automatically.',
  },
  {
    keywords: ['certificate', 'pdf', 'print'],
    reply:
      'Paid plans include certificate generation from leaderboards - school logo, SchoolSportsPro branding, configurable signature lines, print or PDF.',
  },
  {
    keywords: ['role', 'admin', 'coordinator', 'coach', 'viewer', 'permission'],
    reply:
      'Typical roles: School Admin, Coordinator, Coach, and Viewer — with multi-tenant isolation so each school’s data stays separate.',
  },
  {
    keywords: ['leaderboard', 'rank', 'athletics', 'individual'],
    reply:
      'For athletics and individual events you get participants, times or distances, auto-rank, and results. Annual Pro also mentions global ranking on the pricing page.',
  },
  {
    keywords: ['live', 'public', 'share', 'link', 'audience', 'parent'],
    reply:
      'Annual Pro includes a public URL for read-only live views — brackets, matches, and results without logging in. You can enable, copy, or disable the link from the competition page.',
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function getAbReply(userText: string): string {
  const q = normalize(userText);
  if (!q) return FALLBACK_MESSAGE;

  for (const { keywords, reply } of RULES) {
    for (const k of keywords) {
      if (q.includes(k)) return reply;
    }
  }

  return FALLBACK_MESSAGE;
}
