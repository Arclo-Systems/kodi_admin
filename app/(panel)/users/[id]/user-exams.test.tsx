import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { UserDetail } from '@/lib/user-detail';
import { UserExams } from './user-exams';

const examDates: UserDetail['examDates'] = [
  {
    moduleId: 'm1',
    examKey: 's-ucr',
    examName: 'PAA UCR/UNA',
    examDate: '2026-11-20',
    isActive: false,
    module: { shortName: 'PAA' },
  },
  {
    moduleId: 'm1',
    examKey: 's-tec',
    examName: 'Admisión TEC',
    examDate: null,
    isActive: true,
    module: { shortName: 'PAA' },
  },
];

describe('UserExams', () => {
  it('marca cuál examen está activo', () => {
    render(<UserExams examDates={examDates} />);
    expect(screen.getByText('Admisión TEC').closest('li')).toHaveTextContent('Activo');
    expect(screen.getByText('PAA UCR/UNA').closest('li')).not.toHaveTextContent('Activo');
  });

  it('sin exámenes declarados lo dice', () => {
    render(<UserExams examDates={[]} />);
    expect(screen.getByText('Sin exámenes declarados.')).toBeInTheDocument();
  });
});
