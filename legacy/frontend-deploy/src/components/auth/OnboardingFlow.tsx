/**
 * Multi-Step Onboarding Flow Component
 * 
 * A premium onboarding experience with progress indicators, smooth transitions,
 * and step-by-step user setup. Features animated progress bars, form validation,
 * and contextual guidance.
 */

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Globe, 
  Clock, 
  Palette, 
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Play,
  Camera,
  Music,
  Zap
} from 'lucide-react';
import { useCreateUserProfile } from '../../hooks/useUser';
import { useToast } from '../../providers/ToastProvider';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
}

interface FormData {
  displayName: string;
  language: string;
  timezone: string;
  interests: string[];
  experience: string;
  goals: string[];
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user: auth0User } = useAuth0();
  const { mutate: createProfile, isPending } = useCreateUserProfile();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    displayName: auth0User?.name || '',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interests: [],
    experience: '',
    goals: []
  });

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'zh', label: '中文' },
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Seoul', label: 'Seoul' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  const interests = [
    { id: 'marketing', label: 'Marketing Videos', icon: Target },
    { id: 'social', label: 'Social Media', icon: Camera },
    { id: 'education', label: 'Educational Content', icon: User },
    { id: 'entertainment', label: 'Entertainment', icon: Play },
    { id: 'music', label: 'Music Videos', icon: Music },
    { id: 'business', label: 'Business Presentations', icon: Zap },
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner - New to video creation' },
    { value: 'intermediate', label: 'Intermediate - Some experience' },
    { value: 'advanced', label: 'Advanced - Professional creator' },
    { value: 'expert', label: 'Expert - Industry professional' },
  ];

  const goals = [
    { id: 'learn', label: 'Learn video creation', icon: User },
    { id: 'business', label: 'Grow my business', icon: Target },
    { id: 'social', label: 'Build social presence', icon: Camera },
    { id: 'creative', label: 'Express creativity', icon: Palette },
    { id: 'professional', label: 'Professional projects', icon: Zap },
    { id: 'fun', label: 'Just for fun', icon: Sparkles },
  ];

  // Step 1: Basic Information
  const BasicInfoStep: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4"
        >
          <User className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Let's get to know you
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us a bit about yourself to personalize your experience
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Display Name"
          value={formData.displayName}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          placeholder="Enter your display name"
          required
          leftIcon={<User className="h-4 w-4" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Globe className="inline h-4 w-4 mr-1" />
              Language
            </label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
              options={languages}
              placeholder="Select your language"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Timezone
            </label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
              options={timezones}
              placeholder="Select your timezone"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Step 2: Interests
  const InterestsStep: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4"
        >
          <Target className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What interests you?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select the types of videos you'd like to create
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {interests.map((interest, index) => (
          <motion.button
            key={interest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              const newInterests = formData.interests.includes(interest.id)
                ? formData.interests.filter(i => i !== interest.id)
                : [...formData.interests, interest.id];
              setFormData(prev => ({ ...prev, interests: newInterests }));
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              formData.interests.includes(interest.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                formData.interests.includes(interest.id)
                  ? 'bg-primary/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <interest.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{interest.label}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // Step 3: Experience Level
  const ExperienceStep: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto h-16 w-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4"
        >
          <Zap className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What's your experience level?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This helps us customize your experience
        </p>
      </div>

      <div className="space-y-3">
        {experienceLevels.map((level, index) => (
          <motion.button
            key={level.value}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setFormData(prev => ({ ...prev, experience: level.value }))}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              formData.experience === level.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{level.label}</span>
              {formData.experience === level.value && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // Step 4: Goals
  const GoalsStep: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto h-16 w-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4"
        >
          <Target className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          What are your goals?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select what you hope to achieve with AI Video Studio
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goals.map((goal, index) => (
          <motion.button
            key={goal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => {
              const newGoals = formData.goals.includes(goal.id)
                ? formData.goals.filter(g => g !== goal.id)
                : [...formData.goals, goal.id];
              setFormData(prev => ({ ...prev, goals: newGoals }));
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              formData.goals.includes(goal.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                formData.goals.includes(goal.id)
                  ? 'bg-primary/20'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <goal.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{goal.label}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  const steps: OnboardingStep[] = [
    {
      id: 'basic',
      title: 'Basic Info',
      description: 'Personal details',
      icon: User,
      component: BasicInfoStep
    },
    {
      id: 'interests',
      title: 'Interests',
      description: 'What you create',
      icon: Target,
      component: InterestsStep
    },
    {
      id: 'experience',
      title: 'Experience',
      description: 'Your skill level',
      icon: Zap,
      component: ExperienceStep
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'What you want to achieve',
      icon: Target,
      component: GoalsStep
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (!auth0User?.email) {
      error('Email is required');
      return;
    }

    createProfile({
      email: auth0User.email,
      displayName: formData.displayName,
      profileImage: auth0User.picture,
      language: formData.language,
      timezone: formData.timezone,
    }, {
      onSuccess: () => {
        success('Welcome to AI Video Studio!');
        onComplete();
      },
      onError: (err: any) => {
        error(err.response?.data?.error?.message || 'Failed to create profile');
      },
    });
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.displayName.trim().length > 0;
      case 1:
        return formData.interests.length > 0;
      case 2:
        return formData.experience.length > 0;
      case 3:
        return formData.goals.length > 0;
      default:
        return true;
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-primary/5 dark:via-gray-900 dark:to-secondary/5 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Progress bar */}
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Play className="h-6 w-6 text-primary" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  AI Video Studio
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-2 ${
                      index <= currentStep ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      index < currentStep
                        ? 'bg-primary border-primary text-white'
                        : index === currentStep
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {index < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs font-medium">{step.title}</div>
                      <div className="text-xs opacity-75">{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="px-8 py-6">
            <AnimatePresence mode="wait">
              <CurrentStepComponent />
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <Button
                onClick={handleNext}
                disabled={!isStepValid() || isPending}
                className="flex items-center space-x-2"
              >
                {isPending ? (
                  <LoadingSpinner size="sm" />
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <span>Complete Setup</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};