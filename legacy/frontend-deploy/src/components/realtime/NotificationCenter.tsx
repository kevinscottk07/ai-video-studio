/**
 * Notification Center Component
 * 
 * Centralized notification management with real-time updates.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotifications, useSystemAnnouncements } from '../../hooks/useRealTime';
import { cn } from '../../lib/component-variants';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter = ({ className }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, removeNotification, clearAllNotifications } = useNotifications();
  const { announcements, dismissAnnouncement } = useSystemAnnouncements();
  
  const totalCount = notifications.length + announcements.length;
  const hasNotifications = totalCount > 0;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          hasNotifications && 'text-blue-600 dark:text-blue-400'
        )}
      >
        <Bell className="h-5 w-5" />
        
        {hasNotifications && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
          >
            {totalCount > 99 ? '99+' : totalCount}
          </motion.div>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                
                {hasNotifications && (
                  <button
                    onClick={() => {
                      clearAllNotifications();
                      announcements.forEach(a => dismissAnnouncement(a.timestamp));
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="max-h-80 overflow-y-auto">
                {!hasNotifications ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* System Announcements */}
                    {announcements.map((announcement) => (
                      <motion.div
                        key={announcement.timestamp}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                announcement.type === 'maintenance' && 'bg-red-500',
                                announcement.type === 'feature' && 'bg-green-500',
                                announcement.type === 'warning' && 'bg-yellow-500',
                                announcement.type === 'info' && 'bg-blue-500'
                              )} />
                              <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {announcement.title}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {announcement.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatTime(announcement.timestamp)}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => dismissAnnouncement(announcement.timestamp)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Regular Notifications */}
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                notification.type === 'success' && 'bg-green-500',
                                notification.type === 'error' && 'bg-red-500',
                                notification.type === 'warning' && 'bg-yellow-500',
                                notification.type === 'info' && 'bg-blue-500'
                              )} />
                              {notification.title && (
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {notification.title}
                                </h4>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;