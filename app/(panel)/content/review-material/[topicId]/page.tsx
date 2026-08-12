import { requireAction } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { TopicMaterialTabs } from './topic-material-tabs';

export const metadata = { title: 'Material del tema' };

export default async function TopicReviewMaterialPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const user = await requireAction('content:review-material:write');
  const { topicId } = await params;

  return (
    <TopicMaterialTabs
      topicId={topicId}
      canPublish={can(user.role, 'content:review-material:publish')}
    />
  );
}
