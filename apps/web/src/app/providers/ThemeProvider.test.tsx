import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, THEME_STORAGE_KEY } from './ThemeProvider';
import { useTheme } from './theme-context';

function ThemeProbe() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  return <button onClick={() => setTheme('dark')} type="button">{theme}:{resolvedTheme}</button>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    });
  });

  it('persists and applies the selected theme', () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dark');
  });
});
