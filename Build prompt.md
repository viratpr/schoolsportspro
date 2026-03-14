```text
You are a principal engineer building an enterprise-grade, multi-tenant SaaS for Indian schools to manage yearly sports tournaments. Build a production-quality MVP with clean architecture, tenant isolation, RBAC, auditability, performance-minded APIs, and a polished admin UI.

========================================================
STACK (USE EXACTLY)
========================================================
- Frontend: Next.js (App Router) + TypeScript + TailwindCSS
- UI: shadcn/ui
- Forms: React Hook Form + Zod
- Backend: Next.js Route Handlers (App Router /api) + service modules
- DB: PostgreSQL + Prisma ORM
- Auth: NextAuth (Credentials provider) with tenant-aware login
- Validation: Zod on both client + server
- Local dev first, but organize for deployment-ready patterns.

DO NOT introduce other frameworks or services (no Nest, no external auth providers). Avoid overengineering but keep enterprise-grade patterns.

========================================================
ENTERPRISE QUALITY BAR
========================================================
Architectural requirements:
- Clean separation:
  - /lib/auth (session helpers, role/tenant guards)
  - /lib/db (Prisma client, transaction helpers)
  - /lib/services (business logic)
  - /lib/validators (Zod schemas)
  - /app/api/** (thin route handlers calling services)
  - /app/** (pages + components)
- All tenant-owned data must be scoped by tenantId at the DB query level (no client-side filtering).
- Strong typing end-to-end (DTOs inferred from Zod).
- Use DB transactions for multi-write operations (e.g., finalize match + advancement + stats).
- Use cursor pagination for large lists; never return huge nested payloads.
- Add required indexes for performance.
- Include basic audit logging for critical actions.

Security requirements:
- Password hashing with bcrypt.
- Prevent tenant data leakage by enforcing tenantId filtering on every query.
- RBAC checks on every server action/route handler.
- Avoid leaking existence of resources across tenants (return 404 if not in tenant).
- Sanitize/validate every input with Zod.
- Safe error handling: meaningful messages, no stack traces in production.

========================================================
DOMAIN MODEL
========================================================
Tenancy:
- Tenant = School
- Users belong to tenantId (nullable for platform admin).
Roles:
- PLATFORM_ADMIN
- SCHOOL_ADMIN
- COORDINATOR
- COACH
- VIEWER

Core domain:
- Student master list (per tenant)
- Competition (per tenant; yearly tournament)
- Sports library (GLOBAL)
- CompetitionSport (join: competition enables sport; may override rules)
- Category (per competitionSport; with gender + eligibility)
- TEAM flow: Teams, TeamMembers
- INDIVIDUAL flow: ParticipantEntries, IndividualResults

========================================================
FEATURES (MVP+ ENTERPRISE READY)
========================================================

1) MULTI-TENANT + RBAC
- Tenant-aware login:
  - Login form asks: email + password + School Code (or Tenant slug)
  - Validate user belongs to that tenant (except platform admin).
- RBAC utilities:
  - requireSession()
  - requireRole(...roles)
  - requireTenantScope(tenantId)
- Middleware (or server helper) to protect /admin routes.
- Platform admin area accessible only to PLATFORM_ADMIN:
  - Manage tenants
  - Manage global sports library

2) STUDENT MASTER (tenant-scoped)
- CRUD students with fields:
  - admissionNo (unique per tenant)
  - fullName
  - gender: BOYS/GIRLS/OTHER
  - dob (optional)
  - classStandard (string or int)
  - section (optional)
  - house (optional)
  - active (boolean)
- List page:
  - server-side search (name/admissionNo)
  - filters: classStandard, section, gender, active
  - cursor pagination
- CSV import:
  - upload -> parse -> validate -> preview -> confirm import
  - upsert by (tenantId, admissionNo)
  - return a result summary: inserted/updated/skipped/errors

3) COMPETITION (yearly)
- CRUD:
  - name, startDate, endDate, academicYear, status (DRAFT/LIVE/CLOSED), venue (optional)
- Competition dashboard:
  - enabled sports count
  - categories count
  - teams/participants counts
  - match counts (if implemented later)

4) GLOBAL SPORTS LIBRARY (seeded)
- Sport table (GLOBAL):
  - name (unique)
  - sportType: TEAM or INDIVIDUAL
  - defaultRulesText (markdown)
  - defaultCategoryTemplatesJson (array)
  - scoringModel (optional future field)
- Seed sports:
  - Cricket, Football, Kabaddi, Kho-Kho, Basketball, Volleyball, Badminton, Table Tennis, Chess, Carrom,
  - Athletics 100m, 200m, 400m, Long Jump, High Jump, Shot Put, Discus
- For each sport seed:
  - defaultRulesText: concise, usable rules in markdown (not perfect is fine)
  - defaultCategoryTemplatesJson: examples like Boys U14/U17, Girls U14/U17, Open
- CompetitionSport join:
  - enable sport for a competition
  - allow overriddenRulesText per competition

5) CATEGORIES + ELIGIBILITY
- Category fields:
  - name
  - gender: BOYS/GIRLS/MIXED/OPEN
  - eligibilityType: CLASS_RANGE or AGE_RANGE
  - classMin/classMax nullable
  - ageMin/ageMax nullable
- Eligibility checks (minimum):
  - gender match unless OPEN/MIXED
  - class range check if CLASS_RANGE
  - age range check if AGE_RANGE and dob exists (otherwise warn / allow with flag)
- Category UI:
  - create category + choose eligibility type + constraints
  - show sport rules (markdown render) with override display

6) TEAM SPORTS FLOW
- For TEAM sport categories:
  - create Teams
  - add TeamMembers from student master (server-side searchable picker)
  - prevent duplicates; enforce eligibility rules
- (Optional MVP+) placeholder for fixtures; not required unless asked.
- Show team roster and basic metadata.

7) INDIVIDUAL/ATHLETICS FLOW
- For INDIVIDUAL sport categories:
  - add ParticipantEntries (students) with eligibility validation
  - enter IndividualResults:
    - numericValue (float) + displayValue string + rank
    - example: 100m time in seconds/milliseconds, jump distance in meters
  - leaderboard view sorted by rank, then numericValue if rank absent

8) HISTORY
- Competitions persist and are never hard-deleted in UI.
- Past competitions remain viewable:
  - enabled sports, categories, teams/participants, results.

9) AUDIT LOG (enterprise-lite)
- AuditLog table tenant-scoped:
  - actorUserId, action, entityType, entityId, metaJson, createdAt
- Log on:
  - student create/update/import
  - competition create/update/status change
  - enable sport
  - category create/update
  - team create/add member
  - participant add
  - result entry updates

========================================================
MVP PAGES (MUST BUILD)
========================================================
Auth:
- /login  (tenant-aware login: email + password + tenant code)

Admin:
- /admin/students
- /admin/competitions
- /admin/competitions/[id]
- /admin/competitions/[id]/sports
- /admin/competitions/[id]/sports/[competitionSportId]/categories
- /admin/categories/[categoryId]
  - TEAM: teams + team members
  - INDIVIDUAL: participants + results + leaderboard

Platform admin:
- /platform/tenants
- /platform/sports

========================================================
API ROUTES (NEXT.JS ROUTE HANDLERS)
========================================================
Use /app/api/** route handlers calling services.

Tenant context:
- Every request derives tenantId from session (not from client input) for tenant routes.
- Platform routes allowed only to PLATFORM_ADMIN.

Students:
- GET /api/students?query=&class=&section=&gender=&active=&cursor=&take=
- POST /api/students
- PUT /api/students/[studentId]
- DELETE /api/students/[studentId] (soft delete via active=false preferred)
- POST /api/students/import (CSV upload -> JSON preview -> confirm import)

Competitions:
- GET/POST /api/competitions
- GET/PUT /api/competitions/[id]
- POST /api/competitions/[id]/close (sets status=CLOSED)

Sports:
- GET /api/sports (global list for enabling)
Platform:
- GET/POST /api/platform/tenants
- GET/POST/PUT /api/platform/sports

CompetitionSport:
- GET /api/competitions/[id]/sports
- POST /api/competitions/[id]/sports (enable sport)
- PUT /api/competition-sports/[competitionSportId] (override rules text)

Categories:
- GET/POST /api/competition-sports/[competitionSportId]/categories
- GET/PUT /api/categories/[categoryId]

Teams:
- GET/POST /api/categories/[categoryId]/teams
- POST /api/teams/[teamId]/members (add student)
- DELETE /api/teams/[teamId]/members/[studentId] (remove)

Participants + Results:
- GET/POST /api/categories/[categoryId]/participants
- DELETE /api/categories/[categoryId]/participants/[studentId]
- PUT /api/categories/[categoryId]/results (bulk upsert results)
- GET /api/categories/[categoryId]/leaderboard

========================================================
PRISMA SCHEMA REQUIREMENTS (MUST IMPLEMENT)
========================================================
- Add tenantId to all tenant-scoped tables.
- Use enums for roles, status, sportType, gender, eligibilityType.
- Add unique constraints:
  - Student: unique(tenantId, admissionNo)
  - ParticipantEntry: unique(categoryId, studentId)
  - TeamMember: unique(teamId, studentId)
  - Sport: unique(name)
- Add indexes:
  - Student: index(tenantId, classStandard, section), index(tenantId, fullName)
  - Competition: index(tenantId, academicYear)
  - Category: index(tenantId, competitionSportId)
  - Team: index(tenantId, categoryId)
  - ParticipantEntry: index(tenantId, categoryId)
  - AuditLog: index(tenantId, createdAt)
- Soft delete approach:
  - Use active boolean for Student
  - Do not hard-delete competitions; optionally add deletedAt for safety

========================================================
SEEDING REQUIREMENTS
========================================================
Create prisma/seed.ts that:
1) Creates PLATFORM_ADMIN user:
   - email: admin@platform.local
   - password: Admin@1234
2) Seeds ALL sports listed with:
   - defaultRulesText (markdown)
   - defaultCategoryTemplatesJson (array of objects: name, gender, eligibilityType, classMin/classMax or ageMin/ageMax)
3) Optionally seeds one demo tenant + one school admin:
   - tenant code/slug: demo-school
   - school admin email: admin@demo.local
   - password: Demo@1234

========================================================
UI REQUIREMENTS
========================================================
- Use shadcn/ui: Table, Dialog, Button, Input, Select, Tabs, Badge, DropdownMenu
- Use consistent layout:
  - Left sidebar nav for /admin
  - Top header with tenant name and user menu
- Lists:
  - server-side pagination UI (Next.js fetch + query params)
- Forms:
  - RHF + Zod, inline field errors
- Markdown display for rulesText (read-only viewer)

========================================================
PERFORMANCE REQUIREMENTS
========================================================
- All list pages use cursor pagination and thin DTO responses.
- Avoid N+1 queries; use Prisma include/select carefully.
- Do not return nested members on list endpoints unless required.
- Provide fast student picker:
  - server-side search endpoint
  - do not load all students in the client.

========================================================
ERROR HANDLING + OBSERVABILITY (MVP)
========================================================
- Standard API error response format:
  { error: { code, message, details? } }
- Log server errors (console is fine for MVP).
- Validation errors return 400 with details.

========================================================
DELIVERABLES
========================================================
- Full Next.js project with:
  - Prisma schema + migrations
  - Seed script
  - NextAuth credentials
  - RBAC utilities
  - All pages and API routes listed
  - Services layer with tests-lite (optional)
  - README with:
    - env vars
    - docker-compose for postgres (and optional redis)
    - prisma migrate + seed
    - run dev steps
    - demo credentials
- Ensure complete end-to-end flow works locally:
  - login -> students CRUD/import -> create competition -> enable sport -> create category -> add teams/participants -> enter results -> view leaderboard -> close competition -> view history.

Now implement the entire solution according to the above, generating all required code files, folder structure, and exact setup steps in README. Avoid placeholders; make it run locally.
```
