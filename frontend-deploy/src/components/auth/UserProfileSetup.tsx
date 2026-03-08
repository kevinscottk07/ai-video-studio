import { OnboardingFlow } from './OnboardingFlow';

interface UserProfileSetupProps {
  onComplete: () => void;
}

export const UserProfileSetup = ({ onComplete }: UserProfileSetupProps) => {
  return <OnboardingFlow onComplete={onComplete} />;
};