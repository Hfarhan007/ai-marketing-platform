import { useMutation } from '@tanstack/react-query';
import { mockAuthApi, type AuthCredentials, type RegistrationRequest } from '../api/mock-auth-api';

export function useLoginMutation() {
  return useMutation({ mutationFn: (input: AuthCredentials) => mockAuthApi.login(input) });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: (input: RegistrationRequest) => mockAuthApi.register(input) });
}

export function useForgotPasswordMutation() {
  return useMutation({ mutationFn: (email: string) => mockAuthApi.requestPasswordReset(email) });
}

export function useResetPasswordMutation() {
  return useMutation({ mutationFn: ({ password, token }: { password: string; token: string }) => mockAuthApi.resetPassword(token, password) });
}

export function useTwoFactorMutation() {
  return useMutation({ mutationFn: (code: string) => mockAuthApi.verifyTwoFactor(code) });
}

export function useInviteMutation() {
  return useMutation({ mutationFn: ({ name, password, token }: { name: string; password: string; token: string }) => mockAuthApi.acceptInvite(token, name, password) });
}
