import { PrismaClient, SportType, ScoringModel, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sportTemplateByKey } from './sport-templates';

const prisma = new PrismaClient();

const SPORTS = [
  {
    name: 'Basketball',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Basketball
- Points decide the winner. Four quarters; overtime if tied (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 5, maxPlayers: 15, substitutesAllowed: true },
    matchConfigJson: { quarters: 4, quarterMinutes: 10, tieBreaker: 'OVERTIME_5MIN' },
  },
  {
    name: 'Soccer',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Soccer
- Goals decide the winner. Standard two halves.
- Knockout ties can use penalties (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 11, maxPlayers: 18, substitutesAllowed: true },
    matchConfigJson: { halves: 2, halfMinutes: 45, tieBreaker: 'PENALTIES' },
  },
  {
    name: 'Baseball/Softball',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Baseball / Softball
- Team with more runs at the end of innings wins.
- Tie breaker and mercy rules can be configured per event.`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 9, maxPlayers: 16, substitutesAllowed: true },
    matchConfigJson: { innings: 7, tieBreaker: 'EXTRA_INNINGS' },
  },
  {
    name: 'American Football',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## American Football
- Team with more points wins.
- Four quarters with overtime for tied playoff games (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 11, maxPlayers: 50, substitutesAllowed: true },
    matchConfigJson: { quarters: 4, quarterMinutes: 12, tieBreaker: 'OVERTIME' },
  },
  {
    name: 'Volleyball',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SETS' as ScoringModel,
    defaultRulesText: `## Volleyball
- Best of 5 sets. First to 25 (win by 2). Deciding set to 15 (win by 2).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 6, maxPlayers: 14, substitutesAllowed: true },
    matchConfigJson: { bestOfSets: 5, setPoints: 25, decidingSetPoints: 15, winBy: 2 },
  },
  {
    name: 'Wrestling',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Wrestling
- Bout winner advances.
- Team/dual scoring can be tracked as points (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { scoring: 'WIN_POINTS', tieBreak: 'SUDDEN_VICTORY' },
  },
  {
    name: 'Tennis',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'SETS' as ScoringModel,
    defaultRulesText: `## Tennis
- Best of 3 sets.
- Standard tiebreak rules (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity Singles', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity Singles', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity Singles', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School Singles', gender: 'OPEN', eligibility: {} },
      { name: 'Open Singles', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { bestOfSets: 3, tieBreakAt: 6, finalSetTieBreak: true },
  },
  {
    name: 'Swimming 50m Freestyle',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'TIME_DISTANCE' as ScoringModel,
    defaultRulesText: `## Swimming 50m Freestyle
- Fastest legal time wins.
- One attempt per heat (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { type: 'TIME', unit: 'ms', attempts: 1 },
  },
  {
    name: 'Track & Field 100m',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'TIME_DISTANCE' as ScoringModel,
    defaultRulesText: `## Track & Field 100m
- Fastest legal time wins.
- Lane and false start rules are simplified for school events.`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys Varsity', gender: 'BOYS', eligibility: {} },
      { name: 'Girls Varsity', gender: 'GIRLS', eligibility: {} },
      { name: 'Junior Varsity', gender: 'OPEN', eligibility: {} },
      { name: 'Middle School', gender: 'OPEN', eligibility: {} },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { type: 'TIME', unit: 'ms', attempts: 1 },
  },
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIRST_NAMES_MALE = ['Liam', 'Noah', 'Ethan', 'Mason', 'Logan', 'Aiden', 'Lucas', 'Owen', 'Henry', 'Levi'];
const FIRST_NAMES_FEMALE = ['Olivia', 'Emma', 'Ava', 'Sophia', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Aria', 'Ella'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor'];

async function createTenantWithStudents(index: number) {
  const tenantId = `school-tenant-${index.toString().padStart(2, '0')}`;
  const name = `School ${index}`;

  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    create: {
      id: tenantId,
      name,
      city: 'City ' + index,
      state: 'State ' + index,
    },
    update: {},
  });

  const adminEmail = `admin+${tenantId}@demo.local`;
  const schoolAdminHash = await bcrypt.hash('School@1234', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: `${name} Admin`,
      passwordHash: schoolAdminHash,
      role: Role.SCHOOL_ADMIN,
      tenantId: tenant.id,
    },
    update: {},
  });

  const startAdmission = index * 1000;
  for (let i = 1; i <= 50; i++) {
    const gender = Math.random() < 0.5 ? 'MALE' : 'FEMALE';
    const firstName =
      gender === 'MALE'
        ? randomChoice(FIRST_NAMES_MALE)
        : randomChoice(FIRST_NAMES_FEMALE);
    const lastName = randomChoice(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const admissionNo = String(startAdmission + i);

    await prisma.student.upsert({
      where: { tenantId_admissionNo: { tenantId: tenant.id, admissionNo } },
      create: {
        tenantId: tenant.id,
        admissionNo,
        fullName,
        gender,
        classStandard: String(6 + (i % 5)), // 6–10
        section: ['A', 'B', 'C'][i % 3],
        house: ['Red', 'Blue', 'Green', 'Yellow'][i % 4],
      },
      update: {
        fullName,
        gender,
        classStandard: String(6 + (i % 5)),
        section: ['A', 'B', 'C'][i % 3],
        house: ['Red', 'Blue', 'Green', 'Yellow'][i % 4],
      },
    });
  }

  console.log(`Seeded ${tenant.name} with 50 students.`);
}

async function main() {
  const passwordHash = await bcrypt.hash('Admin@1234', 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@platform.local' },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: 'admin@platform.local',
        name: 'Platform Admin',
        passwordHash,
        role: Role.PLATFORM_ADMIN,
      },
    });
    console.log('Created platform admin (admin@platform.local / Admin@1234)');
  }

  for (const s of SPORTS) {
    const templateVariants = sportTemplateByKey[s.name];
    const simpleTemplateJson = templateVariants?.simple ?? null;
    const internationalTemplateJson = templateVariants?.international ?? null;
    const hasInternationalRules = !!internationalTemplateJson;
    await prisma.sport.upsert({
      where: { name: s.name },
      create: {
        ...s,
        scorecardTemplateJson: simpleTemplateJson as object | undefined,
        internationalTemplateJson: internationalTemplateJson as object | undefined,
        hasInternationalRules,
        templateVersion: 1,
      },
      update: {
        sportType: s.sportType,
        scoringModel: s.scoringModel,
        defaultRulesText: s.defaultRulesText,
        defaultCategoryTemplatesJson: s.defaultCategoryTemplatesJson as object,
        teamConfigJson: s.teamConfigJson as object | null,
        matchConfigJson: s.matchConfigJson as object,
        scorecardTemplateJson: simpleTemplateJson as object | undefined,
        internationalTemplateJson: internationalTemplateJson as object | undefined,
        hasInternationalRules,
        templateVersion: 1,
      },
    });
  }
  console.log('Upserted', SPORTS.length, 'sports in global library.');

  const demoSchool = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-001' },
    create: {
      id: 'demo-tenant-001',
      name: 'Demo School',
      city: 'Austin',
      state: 'Texas',
    },
    update: {},
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);
  await prisma.tenantSettings.upsert({
    where: { tenantId: demoSchool.id },
    create: { tenantId: demoSchool.id, sportsLimitTrial: 2 },
    update: {},
  });
  await prisma.tenantSubscription.upsert({
    where: { tenantId: demoSchool.id },
    create: { tenantId: demoSchool.id, plan: 'TRIAL', status: 'TRIALING', trialEndsAt },
    update: {},
  });

  const schoolAdminHash = await bcrypt.hash('School@1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@demoschool.local' },
    create: {
      email: 'admin@demoschool.local',
      name: 'School Admin',
      passwordHash: schoolAdminHash,
      role: Role.SCHOOL_ADMIN,
      tenantId: demoSchool.id,
    },
    update: {},
  });
  console.log('Demo tenant and school admin (admin@demoschool.local / School@1234) ready.');

  // Multi-tenant demo: 10 tenants with 50 students each
  for (let i = 1; i <= 10; i++) {
    await createTenantWithStudents(i);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
