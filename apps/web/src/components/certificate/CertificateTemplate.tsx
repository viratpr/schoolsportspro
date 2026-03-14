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
      className={`relative w-full overflow-hidden rounded-lg ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      <img
        src={BACKGROUND_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col p-6 md:p-10 text-foreground">
        {/* Top row: school logo (left) and Athletic Bharat logo (right) */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-14 w-32 flex items-center justify-start">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="max-h-14 w-auto object-contain" />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{tenantName}</span>
            )}
          </div>
          <img src={BALOGO} alt="Athletic Bharat" className="h-10 w-auto object-contain opacity-90" />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center text-center space-y-2">
          <p className="text-sm md:text-base font-medium opacity-90">{competitionName}</p>
          <p className="text-xs md:text-sm opacity-80">{categoryName}</p>
          <p className="text-xl md:text-2xl font-bold mt-2">{studentName}</p>
          <p className="text-lg md:text-xl font-semibold text-primary">{achievement}</p>
          {displayValue && <p className="text-sm opacity-90">{displayValue}</p>}
          <p className="text-xs opacity-75 mt-1">{date}</p>
        </div>

        {/* Signature block */}
        {signatureLabels.length > 0 && (
          <div className="flex justify-around gap-4 mt-4 pt-4 border-t border-foreground/20">
            {signatureLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center min-w-0 flex-1 max-w-[200px]">
                <div className="h-10 w-full border-b border-foreground/40 mb-1" aria-hidden />
                <span className="text-xs font-medium opacity-80">{label || 'Signature'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
