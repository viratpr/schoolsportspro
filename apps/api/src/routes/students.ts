import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { logAudit } from '../lib/audit.js';
import { requireTenantAccess, requireRole, verifyJWT } from '../middleware/auth.js';
import { createStudentSchema, updateStudentSchema, studentSearchSchema } from '../schemas/tenant.js';
import { tenantIdParam } from '../schemas/common.js';
import { notFound, conflict } from '../lib/errors.js';
import { Role } from '@bharatathlete/db';

export default async function studentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyJWT);

  app.get<{ Params: { tenantId: string }; Querystring: Record<string, string> }>(
    '/tenants/:tenantId/students',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const q = studentSearchSchema.parse({ ...request.query });
      const where: Record<string, unknown> = { tenantId };
      if (q.classStandard) where.classStandard = q.classStandard;
      if (q.section) where.section = q.section;
      if (q.active !== undefined) where.active = q.active;
      if (q.q) {
        where.OR = [
          { fullName: { contains: q.q, mode: 'insensitive' } },
          { admissionNo: { contains: q.q, mode: 'insensitive' } },
        ];
      }
      const list = await prisma.student.findMany({
        where,
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        orderBy: [{ classStandard: 'asc' }, { section: 'asc' }, { fullName: 'asc' }],
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          gender: true,
          classStandard: true,
          section: true,
          house: true,
          active: true,
          createdAt: true,
        },
      });
      const nextCursor = list.length > q.limit ? list[q.limit - 1]?.id : null;
      return reply.send({ data: list.slice(0, q.limit), nextCursor });
    }
  );

  app.post<{ Params: { tenantId: string } }>('/tenants/:tenantId/students', async (request, reply) => {
    const { tenantId } = tenantIdParam.parse(request.params);
    requireTenantAccess(request, tenantId);
    requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
    const body = createStudentSchema.parse(request.body);
    const existing = await prisma.student.findUnique({
      where: { tenantId_admissionNo: { tenantId, admissionNo: body.admissionNo } },
    });
    if (existing) throw conflict('Student with this admission number already exists');
    const student = await prisma.student.create({
      data: {
        ...body,
        tenantId,
        dob: body.dob ? new Date(body.dob) : undefined,
      },
    });
    const userId = (request as FastifyRequest & { user?: { userId: string } }).user?.userId;
    if (userId) {
      await logAudit(prisma, {
        tenantId,
        actorUserId: userId,
        action: 'STUDENT_CREATE',
        entityType: 'Student',
        entityId: student.id,
        metaJson: { admissionNo: student.admissionNo, fullName: student.fullName },
      });
    }
    return reply.status(201).send(student);
  });

  app.get<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const studentId = (request.params as { studentId: string }).studentId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH, Role.VIEWER]);
      const student = await prisma.student.findFirst({
        where: { id: studentId, tenantId },
      });
      if (!student) throw notFound('Student not found');
      return reply.send(student);
    }
  );

  app.patch<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const studentId = (request.params as { studentId: string }).studentId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR, Role.COACH]);
      const body = updateStudentSchema.parse(request.body);
      const student = await prisma.student.update({
        where: { id: studentId },
        data: {
          ...body,
          dob: body.dob ? new Date(body.dob) : undefined,
        },
      });
      if (student.tenantId !== tenantId) throw notFound('Student not found');
      return reply.send(student);
    }
  );

  app.delete<{ Params: { tenantId: string; studentId: string } }>(
    '/tenants/:tenantId/students/:studentId',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      const studentId = (request.params as { studentId: string }).studentId;
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
      if (!student) throw notFound('Student not found');
      await prisma.student.delete({ where: { id: studentId } });
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { tenantId: string }; Body: { csv: string } }>(
    '/tenants/:tenantId/students/import-csv',
    async (request, reply) => {
      const { tenantId } = tenantIdParam.parse(request.params);
      requireTenantAccess(request, tenantId);
      requireRole(request, [Role.SCHOOL_ADMIN, Role.COORDINATOR]);
      const body = request.body as { csv?: string };
      const csv = typeof body?.csv === 'string' ? body.csv : '';
      const lines = csv.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return reply.status(400).send({ error: 'CSV must have header and at least one row' });
      const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
      const admissionNoIdx = header.findIndex((h) => h === 'admissionno' || h === 'admission_no');
      const fullNameIdx = header.findIndex((h) => h === 'fullname' || h === 'full_name' || h === 'name');
      const genderIdx = header.findIndex((h) => h === 'gender');
      const classIdx = header.findIndex((h) => h === 'class' || h === 'classstandard' || h === 'standard');
      const sectionIdx = header.findIndex((h) => h === 'section');
      const houseIdx = header.findIndex((h) => h === 'house');
      if (admissionNoIdx < 0 || fullNameIdx < 0) {
        return reply.status(400).send({ error: 'CSV must include admissionNo and fullName columns' });
      }
      const created: string[] = [];
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map((c) => c.trim());
        const admissionNo = cells[admissionNoIdx] || '';
        const fullName = cells[fullNameIdx] || '';
        if (!admissionNo || !fullName) {
          errors.push(`Row ${i + 1}: missing admissionNo or fullName`);
          continue;
        }
        const genderStr = (cells[genderIdx] || 'MALE').toUpperCase();
        const gender = ['MALE', 'FEMALE', 'OTHER'].includes(genderStr) ? genderStr : 'MALE';
        const classStandard = cells[classIdx] || '1';
        const section = sectionIdx >= 0 ? cells[sectionIdx] : undefined;
        const house = houseIdx >= 0 ? cells[houseIdx] : undefined;
        try {
          await prisma.student.upsert({
            where: { tenantId_admissionNo: { tenantId, admissionNo } },
            create: { tenantId, admissionNo, fullName, gender: gender as 'MALE' | 'FEMALE' | 'OTHER', classStandard, section, house },
            update: { fullName, gender: gender as 'MALE' | 'FEMALE' | 'OTHER', classStandard, section, house },
          });
          created.push(admissionNo);
        } catch {
          errors.push(`Row ${i + 1}: failed to upsert`);
        }
      }
      const userId = (request as FastifyRequest & { user?: { userId: string } }).user?.userId;
      if (userId) {
        await logAudit(prisma, {
          tenantId,
          actorUserId: userId,
          action: 'STUDENT_IMPORT',
          entityType: 'Student',
          entityId: null,
          metaJson: { created: created.length, errors: errors.length },
        });
      }
      return reply.send({ created: created.length, createdIds: created, errors });
    }
  );
}
