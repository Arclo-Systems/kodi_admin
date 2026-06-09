import { NextRequest } from 'next/server';
import { forwardToBackend } from '@/lib/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> },
) {
  const { id, branchId } = await params;
  return forwardToBackend(
    req,
    'PATCH',
    `/v1/admin/economy/sponsors/${id}/branches/${branchId}`,
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; branchId: string }> },
) {
  const { id, branchId } = await params;
  return forwardToBackend(
    req,
    'DELETE',
    `/v1/admin/economy/sponsors/${id}/branches/${branchId}`,
  );
}
