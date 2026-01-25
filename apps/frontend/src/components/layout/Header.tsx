import { useAuth0 } from '@auth0/auth0-react';
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react';
import { useUser } from '../../hooks/useUser';
import { useLanguage } from '../../hooks/useLanguage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/button';
import { LanguageSwitcher } from '../ui/language-switcher';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { logout } = useAuth0();
  const { user, isLoading } = useUser();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout({ 
      logoutParams: { 
        returnTo: window.location.origin 
      } 
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Video Studio
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Language switcher */}
          <LanguageSwitcher variant="compact" />

          {/* Credit balance */}
          {user && (
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full">
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <span className="text-sm font-medium text-primary">
                {t('credits.available', { amount: user.creditBalance })}
              </span>
            </div>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.displayName}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              {user && (
                <>
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                {t('navigation.settings')}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};