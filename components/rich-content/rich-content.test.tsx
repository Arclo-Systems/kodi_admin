import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RichContent } from './rich-content';

const fence = '```svg\n<svg xmlns="http://www.w3.org/2000/svg"><title>T</title><rect/></svg>\n```';

describe('RichContent SVG', () => {
  it('renderiza el fence svg como imagen', () => {
    render(<RichContent value={`Figura:\n\n${fence}`} />);
    expect(screen.getByRole('img', { name: 'T' })).toBeInTheDocument();
  });

  it('allowSvg=false lo deja como código', () => {
    render(<RichContent value={fence} allowSvg={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
