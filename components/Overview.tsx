import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchData } from '../services/googleSheetService';
import { Registration, SongRequest } from '../types';
import { PeopleIcon, MusicNoteIcon, ShareIcon, TrendingUpIcon, AlertTriangleIcon } from './icons';
import { ViewPayload } from './Dashboard';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-lg flex items-center space-x-4 border border-gray-200 shadow-sm">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

interface OverviewProps {
    setActiveView: (view: string, payload?: ViewPayload) => void;
}

const Overview: React.FC<OverviewProps> = ({ setActiveView }) => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [requests, setRequests] = useState<SongRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [regData, reqData] = await Promise.all([
                fetchData<Registration>('Registered Users'),
                fetchData<SongRequest>('Listeners Choice'),
            ]);
            setRegistrations(regData);
            setRequests(reqData);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data. Please check your sheet names and permissions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const analytics = useMemo(() => {
        const totalUsers = registrations.length;
        const totalRequests = requests.length;
        const totalReferrals = registrations.filter(r => r.ReferredByCode?.trim()).length;

        const priorities = { high: 0, medium: 0, low: 0 };
        requests.forEach(req => {
            const occasion = req.Occasion?.toLowerCase() || '';
            if (occasion.includes('birthday') || occasion.includes('anniversary')) {
                priorities.high++;
            } else if (req['Dedication to']?.trim()) {
                priorities.medium++;
            } else {
                priorities.low++;
            }
        });

        const referrerCounts: { [key: string]: number } = {};
        registrations.forEach(r => {
            const referrer = r.ReferredByCode?.trim();
            if (referrer) {
                referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
            }
        });

        const topReferrers = Object.entries(referrerCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return { totalUsers, totalRequests, totalReferrals, priorities, topReferrers };
    }, [registrations, requests]);

    const handleReferrerClick = (referrerCode: string) => {
        setActiveView('registrations', { filter: { column: 'ReferredByCode', value: referrerCode } });
    };

    if (loading) return <div className="p-8 text-center">Calculating insights...</div>;
    
    if (error) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <div className="bg-white border border-yellow-300 p-6 rounded-lg text-center max-w-md shadow-lg">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                         <AlertTriangleIcon />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">Oops! Something went wrong</h3>
                    <p className="mt-2 text-sm text-gray-500">{error}</p>
                    <button 
                        onClick={loadData}
                        className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Registered Users" value={analytics.totalUsers} icon={<PeopleIcon />} />
                <StatCard title="Total Song Requests" value={analytics.totalRequests} icon={<MusicNoteIcon />} />
                <StatCard title="Total Referrals" value={analytics.totalReferrals} icon={<ShareIcon />} />
            </div>

            {/* Analytics Sections */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Request Priorities */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><TrendingUpIcon/> <span className="ml-2">Request Priority Breakdown</span></h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-red-600 font-medium">High Priority</span>
                            <span className="text-lg font-bold text-gray-800">{analytics.priorities.high}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-yellow-600 font-medium">Medium Priority</span>
                            <span className="text-lg font-bold text-gray-800">{analytics.priorities.medium}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-green-600 font-medium">Low Priority</span>
                            <span className="text-lg font-bold text-gray-800">{analytics.priorities.low}</span>
                        </div>
                    </div>
                </div>

                {/* Top Referrers */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center"><ShareIcon/> <span className="ml-2">Top Referrers</span></h2>
                    {analytics.topReferrers.length > 0 ? (
                        <ul className="space-y-3">
                            {analytics.topReferrers.map(([name, count]) => (
                                <li key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <button onClick={() => handleReferrerClick(name)} className="font-medium text-gray-700 hover:text-blue-600 hover:underline">
                                        {name}
                                    </button>
                                    <span className="font-bold text-blue-600">{count} referrals</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No referral data available yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Overview;