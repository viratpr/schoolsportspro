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

export async function GET(request: Request, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params;
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

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 100);

  const list = await prisma.competition.findMany({
    where: { tenantId },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      academicYear: true,
      startDate: true,
      endDate: true,
      venue: true,
      status: true,
      createdAt: true,
    },
  });

  const nextCursor = list.length > limit ? (list[limit - 1]?.id ?? null) : null;
  return NextResponse.json({ data: list.slice(0, limit), nextCursor });
}
