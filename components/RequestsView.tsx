import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SongRequest, RadioShow } from '../types';
import { fetchData } from '../services/googleSheetService';
import { sendMessage } from '../services/twoChatService';
import RequestCard from './RequestCard';
import RequestAnalytics from './RequestAnalytics';
import ReadRequestsLog from './ReadRequestsLog';
import { LoadingIcon, CloseIcon } from './icons';

type Priority = 'High' | 'Medium' | 'Low';

const RequestsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'read'>('list');
    const [requests, setRequests] = useState<SongRequest[]>([]);
    const [schedule, setSchedule] = useState<RadioShow[]>([]);
    const [dismissedRows, setDismissedRows] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoReply, setAutoReply] = useState(false);

    // NEW: State for filters and modal
    const [showFilter, setShowFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [requestToConfirm, setRequestToConfirm] = useState<SongRequest | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    
    const sheetName = 'Listeners Choice';

    const loadData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const [reqResult, scheduleResult] = await Promise.all([
                fetchData<SongRequest>(sheetName),
                fetchData<RadioShow>('TimeSlots') // FIX: Corrected sheet name for consistency
            ]);
            
            const uniqueRequests = Array.from(
                reqResult.reduce((map, req) => {
                    const key = `${req.Date}|${req['Requester Name']?.toLowerCase().trim()}|${req['Song requested']?.toLowerCase().trim()}`;
                    if (!map.has(key) || map.get(key)!.rowIndex < req.rowIndex) map.set(key, req);
                    return map;
                }, new Map<string, SongRequest>()).values()
            );

            setRequests(prev => uniqueRequests.map(newReq => ({ ...newReq, readAt: prev.find(r => r.rowIndex === newReq.rowIndex)?.readAt })));
            setSchedule(scheduleResult);
        } catch (err) {
            setError('Failed to load song requests or schedule.');
            console.error(err);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(true);
        const intervalId = setInterval(() => loadData(false), 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [loadData]);
    
    const getPriority = useCallback((req: SongRequest): Priority => {
        const occasion = req.Occasion?.toLowerCase() || '';
        if (occasion.includes('birthday') || occasion.includes('anniversary')) return 'High';
        if (req['Dedication to']?.trim()) return 'Medium';
        return 'Low';
    }, []);

    const filteredRequests = useMemo(() => {
        return requests
            .filter(req => !dismissedRows.has(req.rowIndex))
            .filter(req => showFilter === 'all' || req.Show === showFilter)
            .filter(req => priorityFilter === 'all' || getPriority(req) === priorityFilter)
            .filter(req => {
                const query = searchQuery.toLowerCase();
                if (!query) return true;
                return req['Requester Name']?.toLowerCase().includes(query) || req['Song requested']?.toLowerCase().includes(query);
            })
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }, [requests, dismissedRows, showFilter, priorityFilter, searchQuery, getPriority]);

    const handleMarkAsRead = (request: SongRequest) => {
        if (autoReply && !request.readAt) {
            setRequestToConfirm(request);
            setModalError(null);
            setShowConfirmModal(true);
        } else {
            toggleReadState(request.rowIndex);
        }
    };

    const toggleReadState = (rowIndex: number) => {
        setRequests(prev => prev.map(r => 
            r.rowIndex === rowIndex ? { ...r, readAt: r.readAt ? undefined : new Date().toISOString() } : r
        ));
    };

    const handleConfirmSend = async () => {
        if (!requestToConfirm) return;

        setIsSending(true);
        setModalError(null);

        const whatsappNumber = requestToConfirm.Whatsapp;
        if (whatsappNumber) {
            try {
                const replyMessage = `Hi ${requestToConfirm['Requester Name']}! Your song request for "${requestToConfirm['Song requested']}" has been seen by the DJ at Eden FM. Thanks for tuning in!`;
                await sendMessage(whatsappNumber, replyMessage);
                
                // Success: mark as read and close modal
                toggleReadState(requestToConfirm.rowIndex);
                setShowConfirmModal(false);
                setRequestToConfirm(null);
            } catch (error) {
                console.error("Failed to send auto-reply:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                setModalError(`Failed to send auto-reply. Reason: ${errorMessage}`);
            } finally {
                setIsSending(false);
            }
        } else {
            // No number, just mark as read and close
            toggleReadState(requestToConfirm.rowIndex);
            setShowConfirmModal(false);
            setRequestToConfirm(null);
            setIsSending(false);
        }
    };

    const handleDismiss = (rowIndex: number) => {
        setDismissedRows(prev => new Set(prev).add(rowIndex));
    };
    
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Listener Requests</h1>
                 <div className="flex items-center space-x-4">
                    <label htmlFor="autoReplyToggle" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-gray-700">Auto-reply on Read</span>
                        <div className="relative">
                            <input type="checkbox" id="autoReplyToggle" className="sr-only" checked={autoReply} onChange={() => setAutoReply(!autoReply)} />
                            <div className={`block w-14 h-8 rounded-full ${autoReply ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-md ${autoReply ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('list')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Request List
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Analytics
                    </button>
                    <button onClick={() => setActiveTab('read')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'read' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Read Log
                    </button>
                </nav>
            </div>
            
            {loading && <div className="mt-8 flex justify-center"><LoadingIcon /></div>}
            {error && <div className="mt-8 text-center text-red-500">{error}</div>}
            
            {!loading && !error && activeTab === 'list' && (
                <>
                <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-4">
                     <input type="text" placeholder="Search name or song..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                     <select value={showFilter} onChange={e => setShowFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Shows</option>
                        {[...new Set(schedule.map(s => s.Show))].map(showName => <option key={showName} value={showName}>{showName}</option>)}
                     </select>
                     <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Priorities</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                     </select>
                </div>
                <div className="mt-6 space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                    {filteredRequests.length > 0 ? filteredRequests.map(req => <RequestCard key={req.rowIndex} request={req} priority={getPriority(req)} onToggleRead={handleMarkAsRead} onDismiss={handleDismiss} />)
                    : <div className="text-center text-gray-500 p-8">No requests match the current filters.</div>}
                </div>
                </>
            )}
            {!loading && !error && activeTab === 'analytics' && (
                <RequestAnalytics />
            )}
            {!loading && !error && activeTab === 'read' && (
                <ReadRequestsLog requests={requests} />
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && requestToConfirm && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md relative">
                        <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800" disabled={isSending}>
                            <CloseIcon />
                        </button>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Confirm Auto-Reply</h2>

                        {modalError && (
                            <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
                                {modalError}
                            </div>
                        )}

                        <p className="text-sm text-gray-600 mb-2">You are about to send the following WhatsApp message:</p>
                        <div className="p-3 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 mb-6">
                           Hi {requestToConfirm['Requester Name']}! Your song request for "{requestToConfirm['Song requested']}" has been seen by the DJ at Eden FM. Thanks for tuning in!
                        </div>
                        <p className="text-sm text-gray-600 mb-6">To: <span className="font-medium">{requestToConfirm.Whatsapp}</span></p>
                         <div className="flex justify-end space-x-4">
                            <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300" disabled={isSending}>Cancel</button>
                            <button onClick={handleConfirmSend} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center justify-center min-w-[6rem]" disabled={isSending}>
                                {isSending ? <LoadingIcon /> : 'Send Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestsView;
