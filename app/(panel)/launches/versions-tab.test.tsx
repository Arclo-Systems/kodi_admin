import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { AppVersion } from '@/hooks/use-launches';

vi.mock('./version-form-dialog', () => ({ VersionFormDialog: () => null }));

const VERSION: AppVersion = {
  id: 'v1',
  platform: 'ios',
  version: '1.1.0',
  releaseDate: '2026-09-27T00:00:00.000Z',
  releaseNotes: null,
  storeUrl: null,
  createdAt: '2026-09-27T15:00:00.000Z',
};

vi.mock('@/hooks/use-launches', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-launches')>()),
  useAppVersions: () => ({ data: [VERSION], isLoading: false, isError: false }),
  useVersionMutations: () => ({ remove: { mutateAsync: vi.fn() } }),
}));

import { VersionsTab } from './versions-tab';

describe('VersionsTab', () => {
  it('la fecha de publicación es un día civil: no se corre al día anterior', () => {
    // `releaseDate` es `@db.Date` (medianoche UTC). En hora de CR eso cae el 26.
    render(<VersionsTab role="admin" />);
    expect(screen.getByText('27/9/2026')).toBeInTheDocument();
  });
});
