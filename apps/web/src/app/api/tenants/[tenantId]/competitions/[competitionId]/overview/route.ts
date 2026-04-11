import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyApiJwt } from '@/lib/api-jwt-verify';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LIST_ROLES = new Set<Role>([
  Role.SCHOOL_ADMIN,
  Role.COORDINATOR,
  Role.COACH,
  Role.VIEWER,
  Role.PLATFORM_ADMIN,
]);

export async function GET(
  request: Request,
  { params }: { params: { tenantId: string; competitionId: string } }
) {
  const { tenantId, competitionId } = params;
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = auth.slice('Bearer '.length).trim();
  const secret = process.env.JWT_SECRET ?? 'change-me-in-production';
  const payload = verifyApiJwt(token, secret);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const role = payload.role as Role;
  if (!LIST_ROLES.has(role)) {
    return NextResponse.json({ error: 'Insufficient role', code: 'FORBIDDEN' }, { status: 403 });
  }
  if (role !== Role.PLATFORM_ADMIN && payload.tenantId !== tenantId) {
    return NextResponse.json({ error: 'Access denied to this tenant', code: 'FORBIDDEN' }, { status: 403 });
  }

  const competition = await prisma.competition.findFirst({
    where: { id: competitionId, tenantId },
    select: {
      id: true,
      name: true,
      academicYear: true,
      startDate: true,
      endDate: true,
      venue: true,
      status: true,
      shareToken: true,
    },
  });
  if (!competition) {
    return NextResponse.json({ error: 'Competition not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const sports = await prisma.competitionSport.findMany({
    where: { tenantId, competitionId, enabled: true },
    select: {
      id: true,
      sportId: true,
      enabled: true,
      sport: { select: { id: true, name: true, sportType: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const sportIds = sports.map((s) => s.id);
  const categories = sportIds.length
    ? await prisma.category.findMany({
        where: { tenantId, competitionSportId: { in: sportIds } },
        select: {
          id: true,
          name: true,
          gender: true,
          format: true,
          competitionSportId: true,
        },
        orderBy: [{ competitionSportId: 'asc' }, { createdAt: 'asc' }],
      })
    : [];

  const categoriesBySportId = new Map<string, Array<{ id: string; name: string; gender: string; format: string }>>();
  for (const c of categories) {
    const list = categoriesBySportId.get(c.competitionSportId) ?? [];
    list.push({ id: c.id, name: c.name, gender: c.gender, format: c.format });
    categoriesBySportId.set(c.competitionSportId, list);
  }

  return NextResponse.json({
    competition,
    sports: sports.map((s) => ({
      id: s.id,
      sportId: s.sportId,
      enabled: s.enabled,
      sport: s.sport,
      categories: categoriesBySportId.get(s.id) ?? [],
    })),
  });
}
