
import React from 'react';
import type { Mode } from '../types';
import { Mode as ModeEnum } from '../types';

interface SidebarProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

const ModeButton: React.FC<{
    mode: Mode;
    currentMode: Mode;
    onClick: (mode: Mode) => void;
    children: React.ReactNode
}> = ({ mode, currentMode, onClick, children }) => {
    const isActive = mode === currentMode;
    return (
        <button
            onClick={() => onClick(mode)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ease-in-out flex items-center gap-3 ${
                isActive
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
        >
            {children}
        </button>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange }) => {
  return (
    <nav className="w-64 bg-gray-800/80 p-4 flex flex-col border-r border-gray-700/50">
        <div className="mb-8">
            <h2 className="text-lg font-bold text-white">Modes</h2>
            <p className="text-xs text-gray-500">Select a feature</p>
        </div>
        <div className="space-y-2">
            <ModeButton mode={ModeEnum.Chat} currentMode={currentMode} onClick={onModeChange}>Chat</ModeButton>
            <ModeButton mode={ModeEnum.ChatLite} currentMode={currentMode} onClick={onModeChange}>Chat (Lite)</ModeButton>
            <ModeButton mode={ModeEnum.Thinking} currentMode={currentMode} onClick={onModeChange}>Thinking Mode</ModeButton>
            <ModeButton mode={ModeEnum.SearchGrounding} currentMode={currentMode} onClick={onModeChange}>Search Grounding</ModeButton>
            <ModeButton mode={ModeEnum.ImageUnderstand} currentMode={currentMode} onClick={onModeChange}>Image Understanding</ModeButton>
            <ModeButton mode={ModeEnum.ImageGen} currentMode={currentMode} onClick={onModeChange}>Image Generation</ModeButton>
            <ModeButton mode={ModeEnum.Live} currentMode={currentMode} onClick={onModeChange}>Live Conversation</ModeButton>
        </div>
    </nav>
  );
};
