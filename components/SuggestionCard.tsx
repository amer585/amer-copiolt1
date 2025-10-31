import React from 'react';

interface SuggestionCardProps {
    icon: React.ReactNode;
    text: string;
    onClick: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ icon, text, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="group flex items-center p-4 bg-brand-gray-100 dark:bg-brand-gray-800/80 hover:bg-brand-gray-200 dark:hover:bg-brand-gray-700 rounded-lg transition-colors duration-200 text-left"
        >
            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                {icon}
            </div>
            <p className="ml-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                {text}
            </p>
        </button>
    );
};
