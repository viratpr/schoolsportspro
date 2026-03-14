## Video Demo Script – Bharat Athlete for Schools

### 1. Hook (0:00–0:20)

- **Narration**
  - "Most school sports days still run on WhatsApp groups, spreadsheets, and last-minute chaos."
  - "What if your entire tournament – teams, fixtures, scorecards, and results – lived in one simple app?"
  - "This is **Bharat Athlete** – a school sports platform built for Indian schools, by people who run real tournaments."

- **Visuals**
  - Quick montage of:
    - Teacher juggling papers/Excel.
    - WhatsApp groups filled with score photos.
    - Then a clean dashboard of Bharat Athlete on laptop + mobile.

---

### 2. Problem Statement (0:20–0:45)

- **Narration**
  - "Running inter-house or inter-school events is hard."
  - "Coordinators have to create fixtures, update brackets, track scores, and answer constant questions: ‘Who plays next?’, ‘What’s the table?’, ‘Where is the result?’"
  - "Data gets scattered – registers, Excel sheets, and photos of handwritten scorecards."

- **Visuals**
  - Show:
    - Messy Excel with matches.
    - Printed paper brackets with hand-written edits.
    - Teachers/PE staff searching for which team plays next.

---

### 3. High-Level Solution (0:45–1:15)

- **Narration**
  - "Bharat Athlete brings **all of this into one centralized platform**."
  - "You create a competition, add sports and categories, generate brackets in one click, and enter scores on a modern scorecard."
  - "The system automatically updates winners, tables, and leaderboards – with **centralized APIs, centralized error handling, and all scoring computation in a robust score engine on the server.**"

- **Visuals**
  - Show the app:
    - Creating a competition.
    - Enabling sports (e.g. football, volleyball, athletics).
    - Overview of categories and brackets.

---

### 4. Key Benefits for Schools (1:15–2:00)

- **For School Management**
  - "Clear overview of all competitions, sports, and results in one place."
  - "Standardized formats across events – no dependency on one teacher’s personal spreadsheet."
  - "Professional-looking brackets, scorecards, and reports that impress parents and partner schools."

- **For Coordinators & PE Teachers**
  - "Automatic bracket generation – no manual redraw when a team withdraws."
  - "Sport-specific scorecards – football, cricket, volleyball, athletics – with correct rules baked in."
  - "Rally-by-rally and set-based scoring for sports like volleyball, with the heavy logic handled in the server middleware."
  - "Less time on admin, more time on the field."

- **For Students & Parents**
  - "Clear, fair, and transparent results."
  - "Easy to see who played, who scored, and which house or school is leading."

- **Visuals**
  - Management view: dashboard of competitions and status.
  - Teacher view: simple forms for scores.
  - Students: leaderboard screen and brackets.

---

### 5. Core Features Walkthrough (2:00–4:00)

#### 5.1 Competitions, Sports & Categories

- **Narration**
  - "Start by creating a competition – for example, ‘Annual Sports Day 2025–26’."
  - "Choose the academic year and dates, then enable sports from a catalog – football, volleyball, athletics, cricket, and more."
  - "Each sport comes with the right **scoring model and templates** preconfigured."

- **Visuals**
  - Show creating a competition and enabling a sport.
  - Show categories like ‘Boys U14 Football’, ‘Girls U17 Volleyball’, ‘Open 100m’.

#### 5.2 Teams, Students & Eligibility

- **Narration**
  - "Add teams quickly – either one by one or in bulk."
  - "Link teams to students so your scorecards and leaderboards use real student data – names, admission numbers, and classes."

- **Visuals**
  - Team creation UI.
  - Adding multiple teams via bulk input.
  - Student list and assigning to teams.

#### 5.3 Brackets & Fixtures

- **Narration**
  - "Generate knockout brackets from your teams with a single click."
  - "The system creates rounds, matches, and pairings. When you enter a match result, the winner automatically advances."

- **Visuals**
  - Show bracket generation and a match detail page.

#### 5.4 Modern, Sport-Specific Scorecards (Highlight Volleyball)

- **Narration**
  - "Each sport uses a **centralized, template-driven scorecard**."
  - "For volleyball, we use a **SETS scoring model**: best of 5 sets, rally scoring, win-by-2, with an optional points cap."
  - "The coordinator simply enters per-set scores – for example, 25–18, 22–25, 26–24, 25–19."
  - "Our centralized score engine (middleware) validates everything: correct target points, win-by-2, max sets, and caps. If a score like 25–24 is invalid, the system rejects it with a clear error message."
  - "Advanced users can optionally track rally-by-rally stats and player-level stats (aces, blocks, digs, etc.), without making the basic use case complicated."

- **Visuals**
  - Show the volleyball scorecard page for a match:
    - Volleyball hint panel (best-of-sets, target points, win-by rules).
    - Set-by-set input fields with hints like ‘First to 25 points, win by 2’.
  - Show an example error message when entering an invalid set score.
  - Show optional player stats columns for volleyball.

#### 5.5 Centralized Score Engine & Error Handling (Technical Confidence)

- **Narration**
  - "Behind the scenes, every scorecard passes through a centralized **score engine** on the server."
  - "All business rules – like volleyball’s win-by-2, cricket’s overs and runs, or time/distance events – live in one tested middleware layer."
  - "This means:
    - A single, **centralized API** for all sports.
    - **Centralized error handling** and consistent validation messages.
    - No complex calculations in the browser – all computation stays in the middleware, keeping results secure and correct."

- **Visuals**
  - Simple architecture diagram:
    - Frontend scorecard → API → Score Engine / Middleware → Database.
  - Highlight that logic is on the server, not buried in spreadsheets.

---

### 6. Transparency: Results, Leaderboards & Audit (4:00–4:45)

- **Narration**
  - "Once a scorecard is finalized, the match status updates to ‘Completed’ and the winner flows into the bracket and leaderboards."
  - "You can always see:
    - Match summaries.
    - Player stat lines (where configured).
    - Category-level champions and standings."
  - "Audit logs ensure you know **who** finalized which match and when."

- **Visuals**
  - Match result view with summary and winner.
  - Leaderboard / category stats.
  - Small note about audit logs (for admins).

---

### 7. Why This Matters for Your School (4:45–5:30)

- **Narration**
  - "With Bharat Athlete, your sports program looks and feels organized, professional, and fair."
  - "You reduce manual admin, avoid disputes over results, and give students the experience they deserve."
  - "Because the platform is **designed specifically for Indian schools**, we understand:
    - House systems.
    - Age categories.
    - Constraints like limited staff and time."
  - "And technically, you get a system that’s:
    - API-driven.
    - Centralized in its logic and error handling.
    - Ready to grow as your sports program grows."

- **Visuals**
  - Shots of students playing, teachers using the app on tablets/phones.
  - Quick clip of an admin viewing competition summary.

---

### 8. Call to Action (5:30–6:00)

- **Narration**
  - "If you’re a school leader, sports coordinator, or PE teacher who wants to upgrade your tournaments from spreadsheets to a modern platform, Bharat Athlete is for you."
  - "Book a demo, or try it for your next sports day."
  - "Let us handle the brackets, scorecards, and rules – so you can focus on the games."

- **Visuals**
  - Show homepage or demo signup screen.
  - End with logo and tagline: **“Bharat Athlete – Built for school sports.”**

