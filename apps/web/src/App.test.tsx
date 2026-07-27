import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandingPage from './app/router/pages/landing-page';

describe('App', () => {
  it('renders the product proposition', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: /transform bold ideas/i })).toBeInTheDocument();
  });
});
