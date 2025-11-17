import React, { useState, useEffect } from 'react';
import DataTable from './DataTable';
import { Registration, FilterConfig, DataTableColumn } from '../types';
import RegistrationDashboard from './RegistrationDashboard';
import { ViewPayload } from './Dashboard';


interface RegistrationsViewProps {
    isAdminUnlocked: boolean;
    onLockRequest: () => void;
    initialFilter?: { column: string; value: string; };
}

const RegistrationsView: React.FC<RegistrationsViewProps> = ({ isAdminUnlocked, onLockRequest, initialFilter }) => {
    // Start on the list tab if a filter is passed, otherwise dashboard
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>(initialFilter ? 'list' : 'dashboard');
    
    const registrationColumns: DataTableColumn<Registration>[] = [
        { key: 'Name', label: 'Name' },
        { key: 'Surname', label: 'Surname' },
        { key: 'Area', label: 'Area' },
        { key: 'Email', label: 'Email' },
        { key: 'ReferredByCode', label: 'Referred By' },
    ];
    const registrationFilters: FilterConfig<Registration>[] = [
      { column: 'Area', type: 'text' },
      { 
        column: 'Email', 
        type: 'dropdown', 
        options: [
            { value: 'all', label: 'All' },
            { value: 'has_value', label: 'Has Email' },
            { value: 'no_value', label: 'No Email' }
        ]
      },
    ];

    const handleTabClick = (tab: 'dashboard' | 'list') => {
        if (tab === 'list' && !isAdminUnlocked) {
            onLockRequest(); // Ask dashboard to show the global modal
        } else {
            setActiveTab(tab);
        }
    };
    
    // If admin becomes unlocked (e.g. from modal), switch to list view
    useEffect(() => {
        if(isAdminUnlocked && activeTab !== 'list') {
            // Check if the user intended to go to the list
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.get('view') === 'registrations-list'){
                 setActiveTab('list');
            }
        }
    }, [isAdminUnlocked, activeTab]);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Registrations</h1>
            
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => handleTabClick('dashboard')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Dashboard
                    </button>
                    <button onClick={() => handleTabClick('list')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Registered Users List
                    </button>
                </nav>
            </div>
            
            <div className="mt-6">
                {activeTab === 'dashboard' && <RegistrationDashboard setActiveView={onLockRequest} />}
                {activeTab === 'list' && isAdminUnlocked && (
                     <DataTable<Registration> 
                        sheetName="Registered Users" 
                        columns={registrationColumns} 
                        title="Registered Users" 
                        filters={registrationFilters} 
                        initialFilter={initialFilter}
                    />
                )}
                 {activeTab === 'list' && !isAdminUnlocked && (
                    <div className="text-center p-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800">Content Locked</h3>
                        <p className="text-gray-500 mt-2">Please unlock admin access to view the registered users list.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegistrationsView;