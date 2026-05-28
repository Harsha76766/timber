import { redirect } from 'next/navigation';

export default function OnboardingRoot() {
  // Ideally, we'd fetch the user's onboarding state from Supabase here
  // and redirect to the correct step based on org.onboardingStep
  // For now, redirect to the first step
  redirect('/onboarding/business');
}
