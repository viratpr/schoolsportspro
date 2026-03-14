import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = (session?.user as { tenantId?: string })?.tenantId;
  if (!tenantId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '');
  if (safeTenantId !== tenantId) {
    return Response.json({ error: 'Invalid tenant' }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }
  const file = formData.get('logo');
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'No logo file' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
  }

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : 'webp';
  const dir = path.join(process.cwd(), 'public', 'uploads', 'tenants', safeTenantId);
  const filename = `logo.${ext}`;
  const filepath = path.join(dir, filename);

  try {
    await mkdir(dir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json({ error: 'Failed to save file' }, { status: 500 });
  }

  const url = `/uploads/tenants/${safeTenantId}/${filename}`;
  return Response.json({ url });
}
