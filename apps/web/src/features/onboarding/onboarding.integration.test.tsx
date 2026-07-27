import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OnboardingWizard } from './pages/OnboardingWizard';
import { initialOnboardingData, useOnboardingStore } from './store/onboarding-store';

describe('onboarding flow', () => {
  afterEach(() => {
    localStorage.clear();
    useOnboardingStore.setState({ completed: false, currentStep: 0, data: initialOnboardingData });
  });

  it('validates each section, persists progress, and completes setup', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/onboarding/workspace']}><Routes><Route path="/onboarding/*" element={<OnboardingWizard />} /><Route path="/app/demo-workspace/dashboard" element={<h1>Workspace dashboard</h1>} /></Routes></MemoryRouter>);

    await user.type(screen.getByLabelText('Workspace name'), 'Northstar Studio');
    await user.type(screen.getByLabelText('Workspace URL'), 'northstar-studio');
    await user.selectOptions(screen.getByLabelText('Industry'), 'saas');
    await user.selectOptions(screen.getByLabelText('Business type'), 'b2b');
    await user.selectOptions(screen.getByLabelText('Company size'), '11-50');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByLabelText('Grow audience'));
    await user.click(screen.getByLabelText('Email'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Team email addresses'), 'teammate@example.com');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Logo name'), 'Northstar mark');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Complete setup' }));

    expect(await screen.findByRole('heading', { name: 'Workspace dashboard' })).toBeInTheDocument();
    expect(useOnboardingStore.getState()).toMatchObject({ completed: true, data: { workspaceSlug: 'northstar-studio' } });
  }, 20_000);
});
