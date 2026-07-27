import { useLocation } from 'react-router-dom';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  TwoFactorPage,
  VerifyEmailPage,
  ResetPasswordPage,
  RecoveryCodePage,
  SessionExpiredPage,
  AccountLockedPage,
  InviteAcceptancePage,
  LogoutPage,
} from '@/features/auth';

export default function AuthPage() {
  const { pathname } = useLocation();
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/forgot-password') return <ForgotPasswordPage />;
  if (pathname === '/reset-password') return <ResetPasswordPage />;
  if (pathname === '/verify-email') return <VerifyEmailPage />;
  if (pathname === '/two-factor') return <TwoFactorPage />;
  if (pathname === '/recovery-code') return <RecoveryCodePage />;
  if (pathname === '/session-expired') return <SessionExpiredPage />;
  if (pathname === '/account-locked') return <AccountLockedPage />;
  if (pathname === '/accept-invite') return <InviteAcceptancePage />;
  if (pathname === '/logout') return <LogoutPage />;
  return <LoginPage />;
}
