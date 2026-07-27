import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OnboardingData {
  brandColor: string;
  businessType: string;
  channels: string[];
  companySize: string;
  currency: string;
  goals: string[];
  industry: string;
  locale: 'ar' | 'en' | 'ur';
  logoName: string;
  teamEmails: string[];
  timezone: string;
  workspaceName: string;
  workspaceSlug: string;
}

interface OnboardingState {
  completed: boolean;
  currentStep: number;
  data: OnboardingData;
  discard: () => void;
  save: (values: Partial<OnboardingData>, currentStep?: number) => void;
  setCompleted: () => void;
}

export const initialOnboardingData: OnboardingData = {
  brandColor: '#4f46e5', businessType: '', channels: [], companySize: '', currency: 'USD',
  goals: [], industry: '', locale: 'en', logoName: '', teamEmails: [], timezone: 'Asia/Karachi',
  workspaceName: '', workspaceSlug: '',
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      currentStep: 0,
      data: initialOnboardingData,
      discard: () => set({ completed: false, currentStep: 0, data: initialOnboardingData }),
      save: (values, currentStep = 0) => set((state) => ({ currentStep, data: { ...state.data, ...values } })),
      setCompleted: () => set({ completed: true, currentStep: 5 }),
    }),
    { name: 'marketflow-onboarding-progress', version: 2 },
  ),
);
