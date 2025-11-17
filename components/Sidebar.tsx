import React from 'react';
import { EdenFMLogo, HomeIcon, MusicNoteIcon, PeopleIcon, NewspaperIcon, MicIcon, AdminIcon, MapPinIcon, AnalystIcon } from './icons';

interface SidebarProps {
  setActiveView: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ setActiveView, activeView }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <HomeIcon /> },
    { id: 'requests', label: 'Requests', icon: <MusicNoteIcon /> },
    { id: 'registrations', label: 'Registrations', icon: <PeopleIcon /> },
    { id: 'admin', label: 'Admin', icon: <AdminIcon /> },
    { id: 'news', label: 'Announcements', icon: <NewspaperIcon /> },
    { id: 'local-news', label: 'Local News', icon: <MapPinIcon /> },
    { id: 'voice-tools', label: 'Voice Tools', icon: <MicIcon /> },
    { id: 'ai-analyst', label: 'AI Analyst', icon: <AnalystIcon /> },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-md">
      <div className="h-20 flex items-center justify-center px-4 border-b border-gray-200">
        <EdenFMLogo className="w-32" />
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.id}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveView(item.id);
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
              activeView === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            {item.icon}
            <span className="ml-3">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;