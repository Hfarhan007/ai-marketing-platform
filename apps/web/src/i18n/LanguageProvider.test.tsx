import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from './config';
import { LanguageProvider } from './LanguageProvider';

describe('LanguageProvider', () => {
  afterEach(() => {
    act(() => setLanguage('en'));
    localStorage.clear();
  });

  it('applies RTL direction and language metadata', () => {
    render(<LanguageProvider><span>content</span></LanguageProvider>);
    act(() => setLanguage('ur'));
    expect(document.documentElement).toHaveAttribute('lang', 'ur');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});
