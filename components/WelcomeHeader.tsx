import React from 'react';

export const WelcomeHeader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center flex-1">
      <h1 className="text-5xl font-bold text-gray-400">
        <span className="text-blue-400">Amer</span>, <span className="text-gray-300">مرحباً</span>
      </h1>
    </div>
  );
};
