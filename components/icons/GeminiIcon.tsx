import React from 'react';

export const GeminiIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
        <defs>
            <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#4285F4'}} />
                <stop offset="50%" style={{stopColor: '#9B72CB'}} />
                <stop offset="100%" style={{stopColor: '#D96570'}} />
            </linearGradient>
        </defs>
        <path d="M12 2L9.44 9.44L2 12L9.44 14.56L12 22L14.56 14.56L22 12L14.56 9.44L12 2Z" fill="url(#gemini-gradient)" />
    </svg>
);