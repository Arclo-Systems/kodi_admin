import type { TreeModule } from '@/hooks/use-modules-tree';

export type IdName = { id: string; name: string };

export function selectSubjects(tree: TreeModule[], moduleId: string): IdName[] {
  const mod = tree.find((m) => m.id === moduleId);
  return mod ? mod.subjects.map((s) => ({ id: s.id, name: s.name })) : [];
}

export function selectTopicsBySubject(
  tree: TreeModule[],
  moduleId: string,
): { subject: string; topics: IdName[] }[] {
  const mod = tree.find((m) => m.id === moduleId);
  if (!mod) return [];
  return mod.subjects.map((s) => ({
    subject: s.name,
    topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
  }));
}

export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => i.name.toLowerCase().includes(q));
}
