import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/users/u1' }));

import { TabsNav } from './tabs-nav';

describe('TabsNav', () => {
  it('no ofrece la pestaña de eventos (PostHog se fue)', () => {
    render(<TabsNav userId="u1" />);

    expect(screen.queryByRole('link', { name: 'Eventos' })).not.toBeInTheDocument();
    const hrefs = screen.getAllByRole('link').map((el) => el.getAttribute('href'));
    expect(hrefs).not.toContain('/users/u1/events');
  });
});
