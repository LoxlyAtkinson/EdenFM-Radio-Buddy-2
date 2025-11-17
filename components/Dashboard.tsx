import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NewsFeed from './NewsFeed';
import AudioFeatures from './AudioFeatures';
import Overview from './Overview';
import AdminView from './AdminView';
import { CloseIcon } from './icons';
import RequestsView from './RequestsView';
import RegistrationsView from './RegistrationsView';
import LocalNews from './LocalNews';
import AIAnalyst from './AIAnalyst';

interface DashboardProps {
  onLogout: () => void;
}

// NEW: Type for the filter payload
export interface ViewPayload {
    filter?: {
        column: string;
        value: string;
    }
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState('overview');
  const [viewPayload, setViewPayload] = useState<ViewPayload | null>(null);
  
  // NEW: Unified admin access state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // FIX: State to store the intended destination view when the modal is triggered.
  const [destinationView, setDestinationView] = useState<string | null>(null);


  const handleSetActiveView = useCallback((view: string, payload: ViewPayload | null = null) => {
    const protectedViews = ['admin', 'registrations-list']; // 'registrations-list' is a virtual view for locking the list
    
    // If view is protected and we're not unlocked, show modal
    if (protectedViews.includes(view) && !isAdminUnlocked) {
        setDestinationView(view); // Store where the user wants to go
        setShowAdminModal(true);
        return; // Stop navigation
    }

    setViewPayload(payload);

    // Special handling for the registrations list tab
    if (view === 'registrations-list') {
        setActiveView('registrations');
    } else {
        setActiveView(view);
    }
  }, [isAdminUnlocked]);
  
  // FIX: This effect triggers navigation after the isAdminUnlocked state is updated.
  useEffect(() => {
    // If the admin lock has just been opened AND we know where the user wanted to go
    if (isAdminUnlocked && destinationView) {
      // Navigate to that view now. The guard in handleSetActiveView will pass.
      handleSetActiveView(destinationView);
      // Reset the destination so this effect doesn't run again unintentionally
      setDestinationView(null);
    }
  }, [isAdminUnlocked, destinationView, handleSetActiveView]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
        setIsAdminUnlocked(true); // This state change will trigger the useEffect
        setShowAdminModal(false);
        setPasswordError('');
        setPassword('');
    } else {
        setPasswordError('Incorrect password.');
    }
  };
  
  // FIX: New handler to clean up state when the modal is closed without logging in.
  const handleCloseModal = () => {
    setShowAdminModal(false);
    setDestinationView(null);
    setPassword('');
    setPasswordError('');
  };
  
  const renderContent = () => {
    switch (activeView) {
      case 'requests':
        return <RequestsView />;
      case 'registrations':
        return <RegistrationsView isAdminUnlocked={isAdminUnlocked} onLockRequest={() => handleSetActiveView('registrations-list')} initialFilter={viewPayload?.filter} />;
      case 'news':
        return <NewsFeed />;
      case 'local-news':
        return <LocalNews />;
      case 'voice-tools':
        return <AudioFeatures />;
      case 'ai-analyst':
        return <AIAnalyst />;
      case 'admin':
        return isAdminUnlocked ? <AdminView /> : null;
      case 'overview':
      default:
        return <Overview setActiveView={handleSetActiveView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      <Sidebar setActiveView={handleSetActiveView} activeView={activeView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          {renderContent()}
        </main>
      </div>
      
      {/* GLOBAL Password Modal for Admin */}
      {showAdminModal && !isAdminUnlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm relative">
                <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                    <CloseIcon />
                </button>
                <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Admin Access Required</h2>
                <p className="text-sm text-gray-500 mb-6 text-center">This section requires additional permissions. Please enter the admin password.</p>
                <form onSubmit={handlePasswordSubmit}>
                    <label htmlFor="admin-password" className="text-sm font-medium text-gray-600">Password</label>
                    <input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 mt-1 text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {passwordError && <p className="text-sm text-red-500 mt-2">{passwordError}</p>}
                    <button type="submit" className="w-full mt-6 px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-300">
                        Unlock
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;