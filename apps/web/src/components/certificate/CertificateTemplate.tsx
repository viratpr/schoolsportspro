'use client';

export type CertificateTemplateProps = {
  competitionName: string;
  categoryName: string;
  studentName: string;
  rank: number;
  displayValue?: string;
  date: string;
  tenantName: string;
  logoUrl?: string | null;
  signatureLabels: string[];
  /** Optional class for the root container (e.g. for print layout). */
  className?: string;
};

const BACKGROUND_IMAGE = '/images/school-sports-saas-dashboard-bg-16x9.png';
const BALOGO = '/logo.svg';

/** ~3 mm solid gold frame for screen and print/PDF */
const CERT_BORDER_MM = '3mm';
const CERT_BORDER_GOLD = '#b8860b';

/** Typography scales with certificate width (cqw) so 16:9 content fits without scroll — print-safe. */
const type = {
  tenant: 'text-[clamp(0.55rem,2.35cqw,0.78rem)] leading-[1.2]',
  competition: 'text-[clamp(0.5rem,2.05cqw,0.72rem)] leading-[1.25]',
  category: 'text-[clamp(0.45rem,1.85cqw,0.65rem)] leading-[1.25]',
  student: 'text-[clamp(0.68rem,3.9cqw,1.2rem)] leading-[1.15]',
  achievement: 'text-[clamp(0.58rem,3.15cqw,1rem)] leading-[1.2]',
  score: 'text-[clamp(0.48rem,1.75cqw,0.62rem)] leading-[1.25]',
  date: 'text-[clamp(0.42rem,1.55cqw,0.55rem)] leading-[1.25]',
} as const;

function rankSuffix(rank: number): string {
  if (rank === 1) return 'st';
  if (rank === 2) return 'nd';
  if (rank === 3) return 'rd';
  return 'th';
}
function rankLabel(rank: number): string {
  return `${rank}${rankSuffix(rank)} Place`;
}

export function CertificateTemplate({
  competitionName,
  categoryName,
  studentName,
  rank,
  displayValue,
  date,
  tenantName,
  logoUrl,
  signatureLabels,
  className = '',
}: CertificateTemplateProps) {
  const achievement = rankLabel(rank);

  return (
    <div
      className={`@container relative box-border w-full overflow-hidden rounded-md print:overflow-hidden ${className}`}
      style={{
        aspectRatio: '16/9',
        borderWidth: CERT_BORDER_MM,
        borderStyle: 'solid',
        borderColor: CERT_BORDER_GOLD,
      }}
    >
      <img
        src={BACKGROUND_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div
        className="relative z-10 flex h-full min-h-0 flex-col px-[clamp(0.375rem,2cqw,1rem)] py-[clamp(0.25rem,1.25cqw,0.65rem)] text-foreground"
      >
        <div
          className="flex h-[clamp(1.45rem,6.5cqw,2rem)] min-h-0 shrink-0 items-center justify-between gap-[1.5cqw] border-b border-foreground/10 pb-[clamp(0.125rem,0.6cqw,0.35rem)]"
        >
          <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-start overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenantName}
                className="max-h-full max-w-[min(100%,26cqw)] w-auto object-contain object-left"
              />
            ) : (
              <span className="sr-only">{tenantName}</span>
            )}
          </div>
          <div className="flex h-full min-h-0 shrink-0 items-center justify-end overflow-hidden">
            <img
              src={BALOGO}
              alt="SchoolSportsPro"
              className="max-h-full max-w-[22cqw] w-auto object-contain object-right opacity-95"
            />
          </div>
        </div>

        {/* Fills space between logo and signatures; no scroll — type uses cqw to stay within 16:9. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
          <div
            className={`mx-auto flex w-[98%] max-h-full min-h-0 flex-col justify-center gap-y-[clamp(0.0625rem,0.35cqw,0.2rem)] overflow-hidden rounded-md bg-white/55 px-[clamp(0.25rem,1.35cqw,0.55rem)] py-[clamp(0.2rem,1.1cqw,0.5rem)] text-center shadow-sm backdrop-blur-[0.5px]`}
          >
            <p className={`line-clamp-2 font-semibold ${type.tenant}`}>{tenantName}</p>
            <p className={`font-medium opacity-90 ${type.competition}`}>{competitionName}</p>
            <p className={`opacity-80 ${type.category}`}>{categoryName}</p>
            <p className={`line-clamp-2 break-words pt-[0.15cqw] font-bold ${type.student}`}>{studentName}</p>
            <p className={`font-semibold text-primary ${type.achievement}`}>{achievement}</p>
            {displayValue ? <p className={`opacity-90 ${type.score}`}>{displayValue}</p> : null}
            {date.trim() ? <p className={`opacity-75 ${type.date}`}>{date}</p> : null}
          </div>
        </div>

        {signatureLabels.length > 0 ? (
          <div
            className="mt-[clamp(0.125rem,0.75cqw,0.35rem)] flex shrink-0 flex-row items-end justify-between gap-[1.2cqw] border-t border-foreground/20 pt-[clamp(0.125rem,0.85cqw,0.45rem)]"
          >
            {signatureLabels.map((label, i) => (
              <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end px-0.5">
                <div
                  className="mb-[0.15cqw] h-[clamp(1rem,4.25cqw,1.35rem)] w-full max-w-[28cqw] border-b-2 border-foreground/40"
                  aria-hidden
                />
                <span className="line-clamp-2 text-center text-[clamp(0.42rem,1.65cqw,0.62rem)] font-medium leading-[1.15] opacity-90">
                  {label || 'Signature'}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
