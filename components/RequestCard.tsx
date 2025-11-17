import React, { useState } from 'react';
import { SongRequest } from '../types';

interface RequestCardProps {
    request: SongRequest;
    priority: 'High' | 'Medium' | 'Low';
    onToggleRead: (request: SongRequest) => void;
    onDismiss: (rowIndex: number) => void;
}

const priorityStyles = {
    High: 'border-red-500',
    Medium: 'border-yellow-500',
    Low: 'border-green-500',
};

// Helper to format time as HHhMM
const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr || typeof timeStr !== 'string') {
        return '';
    }
    // Assuming time format is HH:mm:ss or HH:mm
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        const hour = parts[0].padStart(2, '0');
        const minute = parts[1].padStart(2, '0');
        return `${hour}h${minute}`;
    }
    return timeStr; // Fallback for unexpected formats
};

const RequestCard: React.FC<RequestCardProps> = ({ request, priority, onToggleRead, onDismiss }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`p-4 bg-white rounded-lg border-l-4 shadow-sm ${priorityStyles[priority]} ${request.readAt ? 'opacity-60' : ''} transition-opacity`}>
            <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
                <div className="flex justify-between items-start gap-2">
                    <p className="font-semibold text-gray-800 truncate pr-2 flex-1">{request['Song requested']}</p>
                    <div className="text-xs text-gray-500 flex-shrink-0 flex items-center gap-x-3">
                        <span>{new Date(request.Date).toLocaleDateString()}</span>
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200">{formatTime(request.Time)}</span>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">From: {request['Requester Name']}</p>
            </div>
            
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                    <div className="grid grid-cols-4">
                        <span className="col-span-1 font-semibold text-gray-500">Song:</span>
                        <span className="col-span-3 text-gray-800">{request['Song requested']}</span>
                    </div>
                     <div className="grid grid-cols-4">
                        <span className="col-span-1 font-semibold text-gray-500">From:</span>
                        <span className="col-span-3 text-gray-800">{request['Requester Name']}</span>
                    </div>
                    {request['Dedication to'] && (
                         <div className="grid grid-cols-4">
                            <span className="col-span-1 font-semibold text-gray-500">To:</span>
                            <span className="col-span-3 text-gray-800">{request['Dedication to']}</span>
                        </div>
                    )}
                    {request.Occasion && (
                         <div className="grid grid-cols-4">
                            <span className="col-span-1 font-semibold text-gray-500">Occasion:</span>
                            <span className="col-span-3 text-gray-800">{request.Occasion}</span>
                        </div>
                    )}
                    {request.Whatsapp && (
                         <div className="grid grid-cols-4">
                            <span className="col-span-1 font-semibold text-gray-500">Number:</span>
                            <span className="col-span-3 text-gray-800">{request.Whatsapp}</span>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 flex justify-end items-center space-x-2">
                <button
                    onClick={() => onDismiss(request.rowIndex)}
                    className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 hover:bg-red-600 hover:text-white transition-colors"
                >
                    Dismiss
                </button>
                <button 
                    onClick={() => onToggleRead(request)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${request.readAt ? 'bg-gray-200 text-gray-700 hover:bg-yellow-400 hover:text-black' : 'bg-green-600 text-white hover:bg-green-500'}`}
                >
                    {request.readAt ? 'Mark as Unread' : 'Mark as Read'}
                </button>
            </div>
        </div>
    );
};

export default RequestCard;