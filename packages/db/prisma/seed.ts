import { PrismaClient, SportType, ScoringModel, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { sportTemplateByKey } from './sport-templates';

const prisma = new PrismaClient();

const SPORTS = [
  {
    name: 'Cricket',
    sportType: 'TEAM' as SportType,
    scoringModel: 'CRICKET_LITE' as ScoringModel,
    defaultRulesText: `## Cricket (Limited Overs)
- Two innings per match; limited overs per side.
- Winner: team with higher runs (or successful chase).
- Wickets and runs as per standard rules.`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 11, maxPlayers: 15, substitutesAllowed: true },
    matchConfigJson: { oversPerInnings: 20, innings: 2, ballPerOver: 6 },
  },
  {
    name: 'Football',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Football
- Goals decide the winner. Standard two halves.
- Knockout ties: penalties (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 11, maxPlayers: 11, substitutesAllowed: true },
    matchConfigJson: { halves: 2, halfMinutes: 45, tieBreaker: 'PENALTIES' },
  },
  {
    name: 'Kabaddi',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Kabaddi
- Raids and touches score points. Simplified scoring.`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
    ],
    teamConfigJson: { minPlayers: 7, maxPlayers: 12, substitutesAllowed: true },
    matchConfigJson: { halves: 2, halfMinutes: 20, playersOnCourt: 7, tieBreaker: 'GOLDEN_RAID' },
  },
  {
    name: 'Basketball',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Basketball
- Points decide winner. Four quarters; overtime if tied (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 5, maxPlayers: 12, substitutesAllowed: true },
    matchConfigJson: { quarters: 4, quarterMinutes: 10, tieBreaker: 'OVERTIME_5MIN' },
  },
  {
    name: 'Kho-Kho',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Kho-Kho
- Points from chasing and defending. Simplified rules.`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 9, maxPlayers: 12, substitutesAllowed: true },
    matchConfigJson: { innings: 2, pointsPerInnings: 0 },
  },
  {
    name: 'Volleyball',
    sportType: 'TEAM' as SportType,
    scoringModel: 'SETS' as ScoringModel,
    defaultRulesText: `## Volleyball
- Best of 5 sets. First to 25 (win by 2). Deciding set to 15 (win by 2).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: { minPlayers: 6, maxPlayers: 12, substitutesAllowed: true },
    matchConfigJson: { bestOfSets: 5, setPoints: 25, decidingSetPoints: 15, winBy: 2 },
  },
  {
    name: 'Badminton',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'SETS' as ScoringModel,
    defaultRulesText: `## Badminton
- Best of 3 games. 21 points rally scoring; win by 2; cap at 30 (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14 Singles', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17 Singles', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14 Singles', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17 Singles', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open Singles', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { bestOfGames: 3, gamePoints: 21, winBy: 2, maxPointCap: 30 },
  },
  {
    name: 'Chess',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'SIMPLE_POINTS' as ScoringModel,
    defaultRulesText: `## Chess
- 1 point win, 0.5 draw, 0 loss. Leaderboards by total points (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { scoring: 'WIN_1_DRAW_0_5_LOSS_0', tieBreak: 'BUCHHOLZ_OR_PLAYOFF' },
  },
  {
    name: 'Athletics 100m',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'TIME_DISTANCE' as ScoringModel,
    defaultRulesText: `## Athletics 100m
- Fastest time wins. Lane-based; false start disqualifies (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { type: 'TIME', unit: 'ms', attempts: 1 },
  },
  {
    name: 'Long Jump',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'TIME_DISTANCE' as ScoringModel,
    defaultRulesText: `## Long Jump
- Best distance wins. Multiple attempts (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { type: 'DISTANCE', unit: 'cm', attempts: 3, finalAttemptsTop8: 6 },
  },
  {
    name: 'Shot Put',
    sportType: 'INDIVIDUAL' as SportType,
    scoringModel: 'TIME_DISTANCE' as ScoringModel,
    defaultRulesText: `## Shot Put
- Best legal throw wins. Multiple attempts (simplified).`,
    defaultCategoryTemplatesJson: [
      { name: 'Boys U14', gender: 'BOYS', eligibility: { maxAge: 14 } },
      { name: 'Boys U17', gender: 'BOYS', eligibility: { maxAge: 17 } },
      { name: 'Girls U14', gender: 'GIRLS', eligibility: { maxAge: 14 } },
      { name: 'Girls U17', gender: 'GIRLS', eligibility: { maxAge: 17 } },
      { name: 'Open', gender: 'OPEN', eligibility: {} },
    ],
    teamConfigJson: null,
    matchConfigJson: { type: 'DISTANCE', unit: 'cm', attempts: 3, finalAttemptsTop8: 6 },
  },
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIRST_NAMES_MALE = ['Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Kunal', 'Rahul', 'Arjun', 'Manav', 'Sahil', 'Ishaan'];
const FIRST_NAMES_FEMALE = ['Ananya', 'Isha', 'Kriti', 'Riya', 'Meera', 'Sanya', 'Priya', 'Kavya', 'Nisha', 'Tara'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Patel', 'Reddy', 'Gupta', 'Kulkarni', 'Mehta', 'Nair', 'Singh'];

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
    const templateJson = sportTemplateByKey[s.name] ?? null;
    await prisma.sport.upsert({
      where: { name: s.name },
      create: {
        ...s,
        scorecardTemplateJson: templateJson as object | undefined,
        templateVersion: 1,
      },
      update: {
        sportType: s.sportType,
        scoringModel: s.scoringModel,
        defaultRulesText: s.defaultRulesText,
        defaultCategoryTemplatesJson: s.defaultCategoryTemplatesJson as object,
        teamConfigJson: s.teamConfigJson as object | null,
        matchConfigJson: s.matchConfigJson as object,
        scorecardTemplateJson: templateJson as object | undefined,
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
      city: 'Mumbai',
      state: 'Maharashtra',
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
