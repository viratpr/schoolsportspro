/**
 * Runtime environment reads for server-only code.
 *
 * Next/Webpack can replace `process.env.KNOWN_KEY` with a string literal at **build** time.
 * Production images and CI often run `next build` without Razorpay (or other) secrets, so those
 * inlines become `undefined` forever — even if the container/platform sets them at **run** time.
 * Using a dynamic key lookup avoids that substitution.
 */
export function readServerEnv(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[key];
}
