import React, { useMemo } from 'react';
import { SongRequest } from '../types';

interface ReadRequestsLogProps {
    requests: SongRequest[];
}

const ReadRequestsLog: React.FC<ReadRequestsLogProps> = ({ requests }) => {

    const readRequests = useMemo(() => {
        return requests
            .filter(req => !!req.readAt)
            .sort((a, b) => new Date(b.readAt!).getTime() - new Date(a.readAt!).getTime());
    }, [requests]);

    if (readRequests.length === 0) {
        return (
            <div className="mt-8 text-center bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
                <p className="text-gray-500">No requests have been marked as read yet.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 flow-root bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Song Requested</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Requester</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date Requested</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Time Read</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {readRequests.map((req) => (
                                <tr key={req.rowIndex}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{req['Song requested']}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{req['Requester Name']}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{new Date(req.Date).toLocaleDateString()}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">{new Date(req.readAt!).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReadRequestsLog;