import React from 'react';
import { LogoutIcon } from './icons';

interface HeaderProps {
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Welcome, DJ!</h1>
        <p className="text-sm text-gray-500">Here's what's happening on Eden FM.</p>
      </div>
      <button 
        onClick={onLogout}
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
      >
        <LogoutIcon />
        <span className="ml-2">Logout</span>
      </button>
    </header>
  );
};

export default Header;