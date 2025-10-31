
import React from 'react';
import { GeminiIcon } from './icons/GeminiIcon';

export const WelcomeHeader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center flex-1 w-full max-w-3xl -mt-20">
        <div className="scale-[3]">
            <GeminiIcon />
        </div>
        <h1 className="mt-12 text-4xl font-bold text-gray-700 dark:text-gray-300">
            How can I help you today?
        </h1>
    </div>
  );
};
