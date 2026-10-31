import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // In our frictionless demo, onboarding is unnecessary. Skip straight to dashboard!
  redirect('/dashboard');
}
