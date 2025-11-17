import React, { useState, useEffect, useCallback } from 'react';
import { getGroundedNews } from '../services/geminiService';
import { GroundingChunk } from '../types';
import { LoadingIcon, MapPinIcon, AlertTriangleIcon } from './icons';

const locations = [
    'Eden District',
    'George',
    'Mossel Bay',
    'Oudtshoorn',
    'Knysna',
    'Riversdale',
    'Sedgefield',
    'Ladismith',
    'De Rust',
    'Plettenberg Bay',
    'Uniondale',
];

const LocalNews: React.FC = () => {
    const [selectedLocation, setSelectedLocation] = useState<string>(locations[0]);
    const [newsSummary, setNewsSummary] = useState<string>('');
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed');
    const [customSourcesInput, setCustomSourcesInput] = useState('');

    useEffect(() => {
        const savedSources = localStorage.getItem('edenFmNewsSources');
        if (savedSources) {
            setCustomSourcesInput(savedSources);
        }
    }, []);

    const fetchNews = useCallback(async (location: string) => {
        setLoading(true);
        setError(null);
        setNewsSummary('');
        setSources([]);
        try {
            const sourcesArray = customSourcesInput
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            const result = await getGroundedNews(location, sourcesArray);
            setNewsSummary(result.summary);
            setSources(result.sources);
        } catch (err) {
            setError(`Could not fetch news for ${location}. The AI model might be busy or an API error occurred. Please try again later.`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [customSourcesInput]);

    useEffect(() => {
        if (activeTab === 'feed') {
            fetchNews(selectedLocation);
        }
    }, [selectedLocation, fetchNews, activeTab]);
    
    const handleSaveSettings = () => {
        localStorage.setItem('edenFmNewsSources', customSourcesInput);
        alert('Settings saved! The news feed will now prioritize your custom sources.');
        setActiveTab('feed');
    };

    const shortenUrl = (url: string, maxLength = 60): string => {
        // A more robust function to handle potential Google redirect URLs and format links cleanly.
        try {
            // If the model returns a redirect URL despite the prompt, display a clean label. The link will still function correctly.
            if (url.includes('vertexaisearch.cloud.google.com')) {
                return 'View Source';
            }

            const urlObj = new URL(url);
            // Start with hostname (no www) + full path
            let displayUrl = urlObj.hostname.replace(/^www\./, '') + urlObj.pathname;

            // Remove trailing slash for a cleaner look
            if (displayUrl.endsWith('/')) {
                displayUrl = displayUrl.slice(0, -1);
            }

            if (displayUrl.length <= maxLength) {
                return displayUrl;
            }

            // If too long, truncate the path portion intelligently
            const hostname = urlObj.hostname.replace(/^www\./, '');
            const pathname = urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname;
            
            const availableLength = maxLength - hostname.length - 4; // for '/...'
            if (availableLength < 5) return hostname + '/...';
            
            return hostname + pathname.substring(0, availableLength) + '...';

        } catch (e) {
            // Fallback for invalid URLs or other errors
            let cleanUrl = url.replace(/^(https?:\/\/)?/, '');
            if (cleanUrl.length > maxLength) {
                 return cleanUrl.substring(0, maxLength - 3) + '...';
            }
            return cleanUrl;
        }
    };

    const renderNewsContent = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<h3 class="text-lg font-bold text-gray-900 mb-2">$1</h3>')
            .replace(/(Source:)\s*(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
                const shortUrl = shortenUrl(url);
                return `<div class="mt-2 text-xs text-gray-500">${prefix} <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline" title="${url}">${shortUrl}</a></div>`;
            })
            .replace(/(\r\n|\n|\r){2,}/g, '<hr class="my-6 border-gray-200">');
        return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Local News Feed</h1>
            
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('feed')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'feed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        News Feed
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        Settings
                    </button>
                </nav>
            </div>

            {activeTab === 'feed' && (
                <div>
                    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-4 shadow-sm">
                        <label htmlFor="location-select" className="font-semibold text-gray-700 flex items-center gap-2">
                            <MapPinIcon /> Select Location:
                        </label>
                        <select
                            id="location-select"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="px-3 py-1.5 text-base text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 min-h-[50vh]">
                        {loading && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <LoadingIcon />
                                <p className="mt-4 text-gray-500">Fetching the latest news for {selectedLocation}...</p>
                            </div>
                        )}
                        {error && (
                             <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                                    <AlertTriangleIcon />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-gray-900">Failed to Load News</h3>
                                <p className="mt-2 text-sm text-gray-500">{error}</p>
                                <button onClick={() => fetchNews(selectedLocation)} className="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                    Retry
                                </button>
                            </div>
                        )}
                        {!loading && !error && (
                            <div>
                                <h2 className="text-2xl font-bold text-blue-600 mb-6">News for {selectedLocation}</h2>
                                <div className="text-gray-700 leading-relaxed">
                                    {newsSummary ? renderNewsContent(newsSummary) : <p>No news found for this location.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'settings' && (
                 <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Custom News Sources</h2>
                    <p className="text-sm text-gray-500 mb-4">Enter a comma-separated list of news websites (e.g., iol.co.za, news24.com). The AI will prioritize these sources when fetching news.</p>
                    <textarea 
                        value={customSourcesInput}
                        onChange={(e) => setCustomSourcesInput(e.target.value)}
                        className="w-full bg-gray-50 text-gray-800 p-2 rounded-md h-24 border border-gray-300 focus:ring-2 focus:ring-blue-500"
                        placeholder="iol.co.za, news24.com, sagoodnews.co.za"
                    />
                    <button onClick={handleSaveSettings} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Save Settings
                    </button>
                </div>
            )}
        </div>
    );
};

export default LocalNews;