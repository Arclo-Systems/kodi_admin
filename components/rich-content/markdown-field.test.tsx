import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MarkdownField } from './markdown-field';

describe('MarkdownField SVG', () => {
  it('el botón SVG inserta un fence', () => {
    const onChange = vi.fn();
    render(<MarkdownField value="" onChange={onChange} tools={['svg']} ariaLabel="campo" />);
    fireEvent.click(screen.getByRole('button', { name: /SVG/i }));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('```svg'));
  });

  it('muestra el badge de peso y el botón Optimizar cuando hay un SVG', () => {
    render(
      <MarkdownField
        value={'```svg\n<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>\n```'}
        onChange={vi.fn()}
        tools={['svg']}
        ariaLabel="campo"
      />,
    );
    expect(screen.getByRole('button', { name: /Optimizar/i })).toBeInTheDocument();
  });

  it('sin SVG no muestra Optimizar', () => {
    render(<MarkdownField value="texto" onChange={vi.fn()} tools={['svg']} ariaLabel="campo" />);
    expect(screen.queryByRole('button', { name: /Optimizar/i })).not.toBeInTheDocument();
  });
});
