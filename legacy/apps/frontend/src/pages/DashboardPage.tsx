import { motion } from 'framer-motion';
import { Plus, Play, Users, TrendingUp } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useLanguage } from '../hooks/useLanguage';
import { Button } from '../components/ui/button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const DashboardPage = () => {
  const { user, isLoading } = useUser();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome', { name: user?.displayName })}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('dashboard.readyToCreate')}
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('dashboard.newProject')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('common.create')}
              </p>
            </div>
          </div>
          <Button className="w-full mt-4" size="sm">
            {t('projects.createNew')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Play className="h-5 w-5 text-secondary" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('dashboard.generateVideo')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI-powered
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" size="sm">
            {t('navigation.generate')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('navigation.community')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('dashboard.browseCommuity')}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" size="sm">
            {t('common.search')}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t('credits.balance')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('credits.available', { amount: user?.creditBalance || 0 })}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" size="sm">
            {t('dashboard.buyCredits')}
          </Button>
        </div>
      </motion.div>

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('dashboard.recentProjects')}
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <Play className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t('dashboard.noProjects')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('dashboard.getStartedMessage')}
            </p>
            <div className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('dashboard.newProject')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};