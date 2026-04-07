export const metadata = {
  title: 'About | SchoolSportsPro',
  description:
    'About SchoolSportsPro — school sports tournament management for K-12 programs. Less paperwork, clearer results, happier students and families.',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">About SchoolSportsPro</h1>

      <p className="text-muted-foreground mb-4">
        SchoolSportsPro is built for schools that want to run sports day and seasonal tournaments without the usual chaos. Instead of juggling spreadsheets, paper scorecards, and group chat updates, everything lives in one place: your competitions, categories, teams, scores, and results. Coaches and coordinators spend less time on admin and more time on what matters - the students and the sport.
      </p>

      <p className="text-muted-foreground mb-4">
        <strong className="text-foreground">One place for everyone.</strong> When you create a competition and add your sports and categories, the whole school can follow along. Coaches enter scores using simple, sport-specific scorecards - basketball, soccer, baseball, volleyball, track and field, and more. Knockout brackets update automatically when a match is decided, so no one has to chase "who won?" or "who plays next?". For individual events, leaderboards show rankings at a glance. Students and families see the same information you see, so there is less confusion and fewer repetitive status questions.
      </p>

      <p className="text-muted-foreground mb-4">
        <strong className="text-foreground">Recognition that feels real.</strong> After results are in, you can generate certificates straight from the leaderboard - with your school logo and SchoolSportsPro branding. You choose who signs (for example: Principal, Athletic Director), then print or download as PDF. Every participant can get something to take home, and top performers get the recognition they deserve without extra manual work.
      </p>

      <p className="text-muted-foreground mb-4">
        <strong className="text-foreground">Share without the hassle.</strong> Want to let parents or guests follow the tournament without logging in? You can turn on a public live view link for a competition and share it. They see brackets and results in real time. When you’re done, you can disable the link. No need to send screenshots or answer the same “what’s the score?” messages again and again.
      </p>

      <p className="text-muted-foreground mb-4">
        <strong className="text-foreground">Built for how schools actually work.</strong> Different people have different roles - some manage the whole event, some only enter scores for their sport. SchoolSportsPro respects that: your school's data stays yours, and each person sees only what they need. As your program grows - more events, more years - the same system scales with you. Less re-inventing the wheel each season, and a more professional, repeatable way to run school sports.
      </p>

      <p className="text-muted-foreground mb-8">
        Our goal is simple: make tournament management clear, fair, and easy so that schools can focus on building a real culture of sport. If that sounds like what you need, we’d love to help.
      </p>

      <a
        href="/SchoolSportsPro_Sports_Day_Simplified.pdf"
        download="SchoolSportsPro_Sports_Day_Simplified.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Download Sports Day Simplified (PDF)
      </a>
    </div>
  );
}
