import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { requireAction } from '@/lib/guard';
import { getUserDetail } from '@/lib/user-detail';
import { UserHeader } from './user-header';
import { TabsNav } from './tabs-nav';

export const metadata: Metadata = { title: 'Usuario' };

export default async function UserLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAction('user:read');
  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <UserHeader user={user} />
      <TabsNav userId={id} />
      <div>{children}</div>
    </div>
  );
}
