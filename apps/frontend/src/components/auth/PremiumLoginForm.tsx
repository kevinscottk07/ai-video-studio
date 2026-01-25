/**
 * Premium Login Form Component
 * 
 * A world-class authentication form with smooth animations, social login,
 * and premium design elements. Features animated transitions, hover effects,
 * and professional styling.
 */

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Sparkles,
  Users,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface PremiumLoginFormProps {
  onModeChange?: (mode: 'login' | 'signup') => void;
  returnTo?: string;
}

export const PremiumLoginForm: React.FC<PremiumLoginFormProps> = ({
  onModeChange,
  returnTo = '/dashboard'
}) => {
  const { loginWithRedirect, isLoading } = useAuth0();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovering, setIsHovering] = useState<string | null>(null);

  const handleEmailAuth = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: mode === 'signup' ? 'signup' : 'login',
      },
      appState: {
        returnTo,
      },
    });
  };

  const handleSocialLogin = (connection: string) => {
    loginWithRedirect({
      authorizationParams: {
        connection,
      },
      appState: {
        returnTo,
      },
    });
  };

  const toggleMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login';
    setMode(newMode);
    onModeChange?.(newMode);
  };

  const features = [
    {
      icon: Sparkles,
      text: 'AI-powered video generation',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      icon: Users,
      text: 'Community sharing & collaboration',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Shield,
      text: 'Enterprise-grade security',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: Zap,
      text: 'Lightning-fast processing',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
        {/* Header with animated logo */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: 0.2, 
              type: 'spring', 
              stiffness: 200,
              damping: 15
            }}
            className="mx-auto h-16 w-16 bg-gradient-to-r from-primary via-purple-500 to-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg"
          >
            <Play className="h-8 w-8 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent mb-2">
              AI Video Studio
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {mode === 'login' ? 'Welcome back!' : 'Join the future of video creation'}
            </p>
          </motion.div>

          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-xl"
            />
            <motion.div
              animate={{ 
                rotate: -360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                duration: 25,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-xl"
            />
          </div>
        </div>

        {/* Features showcase */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="px-8 pb-6"
        >
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`p-1 rounded-md ${feature.bgColor}`}>
                  <feature.icon className={`h-3 w-3 ${feature.color}`} />
                </div>
                <span className="truncate">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social login buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="px-8 pb-6 space-y-3"
        >
          {/* Google login */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovering('google')}
            onHoverEnd={() => setIsHovering(null)}
          >
            <Button
              onClick={() => handleSocialLogin('google-oauth2')}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-lg transition-all duration-200"
              size="lg"
              disabled={isLoading}
            >
              <motion.div
                animate={{ rotate: isHovering === 'google' ? 360 : 0 }}
                transition={{ duration: 0.5 }}
                className="mr-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </motion.div>
              Continue with Google
              <motion.div
                animate={{ x: isHovering === 'google' ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>

          {/* GitHub login */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovering('github')}
            onHoverEnd={() => setIsHovering(null)}
          >
            <Button
              onClick={() => handleSocialLogin('github')}
              className="w-full bg-gray-900 dark:bg-gray-800 text-white border-2 border-gray-800 dark:border-gray-700 hover:bg-gray-800 dark:hover:bg-gray-700 hover:shadow-lg transition-all duration-200"
              size="lg"
              disabled={isLoading}
            >
              <motion.div
                animate={{ rotate: isHovering === 'github' ? 360 : 0 }}
                transition={{ duration: 0.5 }}
                className="mr-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </motion.div>
              Continue with GitHub
              <motion.div
                animate={{ x: isHovering === 'github' ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.0 }}
          className="px-8 pb-6"
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or continue with email
              </span>
            </div>
          </div>
        </motion.div>

        {/* Email login button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="px-8 pb-6"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovering('email')}
            onHoverEnd={() => setIsHovering(null)}
          >
            <Button
              onClick={handleEmailAuth}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <motion.div
                  animate={{ rotate: isHovering === 'email' ? 360 : 0 }}
                  transition={{ duration: 0.5 }}
                  className="mr-3"
                >
                  <Mail className="h-5 w-5" />
                </motion.div>
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'} with Email
              <motion.div
                animate={{ x: isHovering === 'email' ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-auto"
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>

        {/* Mode toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="px-8 pb-8 text-center"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <motion.button
              onClick={toggleMode}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </motion.button>
          </p>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="px-8 pb-8"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline transition-colors">
              Privacy Policy
            </a>
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};