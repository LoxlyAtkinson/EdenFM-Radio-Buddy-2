import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TCConversation, TCMessage } from '../types';
import { fetchConversations, fetchMessages, sendMessage } from '../services/twoChatService';
import { SendIcon, LoadingIcon } from './icons';

const WhatsApp: React.FC = () => {
    const [conversations, setConversations] = useState<TCConversation[]>([]);
    const [messages, setMessages] = useState<TCMessage[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollingIntervalRef = useRef<number | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            const fetchedConversations = await fetchConversations();
            // Sort conversations by the most recent message timestamp
            const sorted = fetchedConversations.sort((a, b) => 
                new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
            setConversations(sorted);
        } catch (err) {
            setError('Failed to load WhatsApp conversations. Check API key and device phone number.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
        // Clear previous interval if it exists
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        // Poll for new conversations/updates every 10 seconds
        pollingIntervalRef.current = window.setInterval(loadConversations, 10000);
        
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [loadConversations]);

    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedConversationId) return;
            setLoadingMessages(true);
            try {
                const fetchedMessages = await fetchMessages(selectedConversationId);
                setMessages(fetchedMessages);
            } catch (err) {
                setError(`Failed to load messages for ${selectedConversationId}.`);
                console.error(err);
            } finally {
                setLoadingMessages(false);
            }
        };
        loadMessages();
    }, [selectedConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedConversationId) return;
        
        setIsSending(true);
        try {
            const sentMessage = await sendMessage(selectedConversationId, messageInput);
            setMessages(prev => [...prev, sentMessage]);
            setMessageInput('');
            // Refresh conversation list to show updated last message
            await loadConversations();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Failed to send WhatsApp message:', err);
            alert(`Failed to send message. Reason: ${errorMessage}`);
        } finally {
            setIsSending(false);
        }
    };
    
    const selectedConversation = useMemo(() => {
        return conversations.find(c => c.id === selectedConversationId);
    }, [conversations, selectedConversationId]);

    if (loading) return <div className="p-8 text-center">Loading conversations...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="flex h-full max-h-[calc(100vh-10rem)] border border-gray-200 rounded-lg bg-white shadow-md">
            {/* Conversation List */}
            <aside className="w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-gray-50 z-10">
                    <h2 className="text-xl font-semibold text-gray-800">WhatsApp Chats</h2>
                </div>
                <ul>
                    {conversations.map(conv => (
                        <li key={conv.id} onClick={() => setSelectedConversationId(conv.id)}
                            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-blue-50 ${selectedConversationId === conv.id ? 'bg-blue-100' : ''}`}>
                            <div className="flex justify-between">
                                <span className="font-bold text-gray-800">{conv.name || conv.id}</span>
                                <span className="text-xs text-gray-500">{new Date(conv.last_message_at).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{conv.last_message_text}</p>
                        </li>
                    ))}
                </ul>
            </aside>
            
            {/* Chat Window */}
            <main className="w-2/3 flex flex-col">
                {selectedConversation ? (
                    <>
                        <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">{selectedConversation.name || selectedConversation.id}</h3>
                        </header>
                        
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100 relative">
                            {loadingMessages && (
                                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 flex justify-center items-center z-10">
                                    <LoadingIcon />
                                </div>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${!msg.from_me ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`p-3 rounded-2xl max-w-lg shadow-sm ${!msg.from_me ? 'bg-white text-gray-800 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                                        {msg.type === 'image' && msg.media_url && (
                                            <img src={msg.media_url} alt="WhatsApp media" className="mb-2 rounded-lg max-w-xs cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />
                                        )}
                                        <p>{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <footer className="p-4 border-t border-gray-200 flex items-center bg-white">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                                placeholder="Type your message..."
                                className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                                disabled={isSending}
                            />
                            <button onClick={handleSendMessage} disabled={isSending || !messageInput.trim()} className="ml-3 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {isSending ? <LoadingIcon /> : <SendIcon />}
                            </button>
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <p className="text-gray-500">Select a conversation to start chatting.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default WhatsApp;
