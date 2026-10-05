import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppVersion } from '@/hooks/use-launches';

const create = vi.fn();
const update = vi.fn();

vi.mock('@/hooks/use-launches', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-launches')>()),
  useVersionMutations: () => ({ create: { mutateAsync: create }, update: { mutateAsync: update } }),
}));

import { VersionFormDialog } from './version-form-dialog';

const VERSION: AppVersion = {
  id: 'v1',
  platform: 'ios',
  version: '1.1.0',
  releaseDate: '2026-09-27T00:00:00.000Z',
  releaseNotes: 'Arreglos',
  storeUrl: 'https://apps.apple.com/app/id1',
  createdAt: '2026-09-27T15:00:00.000Z',
};

const guardar = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

describe('VersionFormDialog', () => {
  beforeEach(() => {
    create.mockReset();
    update.mockReset();
  });

  it('al editar, vaciar el link y las notas los borra: manda null', async () => {
    render(<VersionFormDialog version={VERSION} open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Link a la store (opcional)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: '  ' } });
    guardar();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      id: 'v1',
      input: { storeUrl: null, releaseNotes: null },
    });
  });

  it('al editar sin tocar los opcionales, los manda como estaban', async () => {
    render(<VersionFormDialog version={VERSION} open onOpenChange={() => {}} />);
    guardar();

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      input: { storeUrl: VERSION.storeUrl, releaseNotes: VERSION.releaseNotes },
    });
  });
});
