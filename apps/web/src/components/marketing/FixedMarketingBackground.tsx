/**
 * Same full-page background as (marketing)/layout — image + light gradient overlay.
 */
export function FixedMarketingBackground() {
  return (
    <>
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/school-sports-saas-dashboard-bg-16x9.png)' }}
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-b from-white/25 via-white/15 to-white/30"
        aria-hidden
      />
    </>
  );
}
