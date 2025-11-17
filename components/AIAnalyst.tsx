import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { getComplexResponse, getSimpleResponse } from '../services/geminiService';
import { fetchData } from '../services/googleSheetService';
import { SendIcon } from './icons';

const AIAnalyst: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'Hi! I am Eden FM Buddy. How can I help you analyze the station data today? Ask me about top songs, user registrations by area, or request trends.' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const isDataQuery = (query: string): boolean => {
    const keywords = ['request', 'register', 'how many', 'who', 'list', 'filter', 'today', 'last', 'latest', 'common', 'birthday', 'show', 'presenter', 'area'];
    return keywords.some(keyword => query.toLowerCase().includes(keyword));
  };
  
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setMessages(prev => [...prev, { sender: 'bot', text: '', isThinking: true }]);

    try {
        let botResponseText: string;
        if (isDataQuery(input)) {
            const [requests, registrations, announcements, schedule] = await Promise.all([
                fetchData('Listeners Choice'),
                fetchData('Registered Users'),
                fetchData('Announcements'),
                fetchData('TimeSlots')
            ]);
            const context = { requests, registrations, announcements, schedule };
            botResponseText = await getComplexResponse(input, context);
        } else {
            botResponseText = await getSimpleResponse(input);
        }
        
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.isThinking) {
                lastMessage.text = botResponseText;
                lastMessage.isThinking = false;
            }
            return newMessages;
        });

    } catch (error) {
        console.error("Error fetching bot response:", error);
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.isThinking) {
                lastMessage.text = "Sorry, I encountered an error. Please try again.";
                lastMessage.isThinking = false;
            }
            return newMessages;
        });
    }
  }, [input]);

  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Analyst</h1>
      <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-100">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-3xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                  {msg.isThinking ? (
                     <div className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                    </div>
                  ) : (
                    <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                  )}
                </div>
              </div>
            ))}
             <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-gray-200 flex items-center bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about station data..."
              className="flex-1 bg-gray-100 text-gray-800 px-3 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
            />
            <button onClick={handleSend} className="ml-3 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                <SendIcon />
            </button>
          </div>
        </div>
    </div>
  );
};

export default AIAnalyst;