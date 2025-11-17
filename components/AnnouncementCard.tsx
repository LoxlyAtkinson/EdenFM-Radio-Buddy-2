import React from 'react';
import { NewsItem } from '../types';
import { EditIcon, DeleteIcon } from './icons';

interface AnnouncementCardProps {
    announcement: NewsItem;
    onEdit: (item: NewsItem) => void;
    onDelete: (rowIndex: number) => void;
}

const getMediaType = (url: string): 'image' | 'audio' | 'document' | 'unknown' => {
    if (!url) return 'unknown';
    try {
        const path = new URL(url).pathname;
        const extension = path.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'audio';
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'ppt', 'pptx'].includes(extension)) return 'document';
        return 'unknown';
    } catch (e) {
        return 'unknown';
    }
};

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onEdit, onDelete }) => {
    const mediaType = announcement.MediaURL ? getMediaType(announcement.MediaURL) : null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <div className="flex items-baseline gap-4">
                         <h2 className="text-xl font-semibold text-blue-600">{announcement.Title}</h2>
                         <p className="text-sm text-gray-500">{new Date(announcement.Date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-xs text-gray-600 bg-gray-200 inline-block px-2 py-1 rounded mt-1">{announcement.Category}</p>
                </div>
                 <div className="flex-shrink-0 flex items-center">
                    <button onClick={() => onEdit(announcement)} className="p-2 text-gray-500 hover:text-blue-600" title="Edit"><EditIcon /></button>
                    <button onClick={() => onDelete(announcement.rowIndex)} className="p-2 text-gray-500 hover:text-red-600" title="Delete"><DeleteIcon /></button>
                </div>
            </div>
            
            <p className="mt-4 text-gray-700 whitespace-pre-wrap">{announcement.Content}</p>
            
            {mediaType && announcement.MediaURL && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    {mediaType === 'image' && <img src={announcement.MediaURL} alt={announcement.Title} className="rounded-lg max-h-80 object-contain border border-gray-200" />}
                    {mediaType === 'audio' && <audio controls src={announcement.MediaURL} className="w-full">Your browser does not support the audio element.</audio>}
                    {mediaType === 'document' && <a href={announcement.MediaURL} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Download Attachment</a>}
                    {mediaType === 'unknown' && <a href={announcement.MediaURL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">View Media</a>}
                </div>
            )}
        </div>
    );
};

export default AnnouncementCard;
