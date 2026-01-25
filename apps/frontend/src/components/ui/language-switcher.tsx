import React from 'react';
import { ChevronDownIcon, GlobeIcon } from 'lucide-react';
import { useLanguage, type Language } from '../../hooks/useLanguage';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'default',
  className = '',
}) => {
  const { currentLanguage, supportedLanguages, changeLanguage, t } = useLanguage();

  const handleLanguageChange = (language: Language) => {
    changeLanguage(language.code);
  };

  const renderTrigger = () => {
    switch (variant) {
      case 'icon-only':
        return (
          <Button variant="ghost" size="sm" className={`p-2 ${className}`}>
            <GlobeIcon className="h-4 w-4" />
          </Button>
        );
      case 'compact':
        return (
          <Button variant="ghost" size="sm" className={`gap-1 ${className}`}>
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
            <ChevronDownIcon className="h-3 w-3" />
          </Button>
        );
      default:
        return (
          <Button variant="ghost" className={`gap-2 ${className}`}>
            <GlobeIcon className="h-4 w-4" />
            <span className="text-lg">{currentLanguage.flag}</span>
            <span className="font-medium">{currentLanguage.nativeName}</span>
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderTrigger()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language)}
            className={`flex items-center gap-3 cursor-pointer ${
              currentLanguage.code === language.code
                ? 'bg-accent text-accent-foreground'
                : ''
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <div className="flex flex-col">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">{language.name}</span>
            </div>
            {currentLanguage.code === language.code && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};