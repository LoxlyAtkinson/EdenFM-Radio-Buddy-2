import React, { useState } from 'react';
import WhatsApp from './WhatsApp';
import WhatsAppAgent from './WhatsAppAgent';
import ShowManagement from './ShowManagement';

const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('live-chat');

  const tabs = [
    { id: 'live-chat', label: 'WhatsApp Live Chat' },
    { id: 'agent', label: 'WhatsApp Agent' },
    { id: 'shows', label: 'Show Management' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {activeTab === 'live-chat' && <WhatsApp />}
        {activeTab === 'agent' && <WhatsAppAgent />}
        {activeTab === 'shows' && <ShowManagement />}
      </div>
    </div>
  );
};

export default AdminView;