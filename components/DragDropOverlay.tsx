import React from 'react';
import { UploadIcon } from './icons/UploadIcon';

export const DragDropOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-brand-dark/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none">
      <div className="text-blue-500 dark:text-blue-300 scale-150">
        <UploadIcon />
      </div>
      <p className="text-lg font-semibold mt-4 text-gray-700 dark:text-gray-200">Drop your image here</p>
    </div>
  );
};