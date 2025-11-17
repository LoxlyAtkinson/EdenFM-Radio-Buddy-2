import React, { useState, useEffect, useCallback, useRef } from 'react';
import KnowledgeBase from './KnowledgeBase';
import { AgentSession, GeminiChatTurn, KnowledgeBaseItem } from '../types';
import { getWhatsappAgentResponse } from '../services/geminiService';
import { fetchData } from '../services/googleSheetService';
import { LoadingIcon, SendIcon, ClockIcon, DeleteIcon } from './icons';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_HISTORY_TURNS = 10; // 5 user, 5 model

const WhatsAppAgent: React.FC = () => {
  // Agent configuration state
  const [isAgentEnabled, setIsAgentEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Eden FM Buddy, a friendly and helpful AI assistant for our listeners on WhatsApp. Your goal is to assist with song requests, user registrations, and answer questions based on your knowledge base. Be conversational and engaging. If you cannot handle a request, politely inform the user that you will forward their message to a human DJ."
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Session management and tester state
  const [sessionMemory, setSessionMemory] = useState<Map<string, AgentSession>>(new Map());
  const [activeTestUserId, setActiveTestUserId] = useState<string>('user-123');
  const [testUserInput, setTestUserInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load knowledge base data on mount
  useEffect(() => {
    const loadKB = async () => {
      try {
        const data = await fetchData<KnowledgeBaseItem>('KnowledgeBase');
        setKnowledgeBase(data);
      } catch (error) {
        console.error("Failed to load Knowledge Base:", error);
      }
    };
    loadKB();
  }, []);

  // Effect for automatic session cleanup
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setSessionMemory(prev => {
        const newMemory = new Map(prev);
        let changed = false;
        for (const [userId, session] of newMemory.entries()) {
          if (now - (session as AgentSession).lastActive > SESSION_TIMEOUT_MS) {
            newMemory.delete(userId);
            changed = true;
          }
        }
        return changed ? newMemory : prev;
      });
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMemory, activeTestUserId]);
  
  const handleSaveSettings = () => {
    setSaveStatus('saving');
    // Simulate API call
    setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  const handleSendMessage = useCallback(async () => {
    if (!testUserInput.trim() || isThinking) return;

    const userTurn: GeminiChatTurn = { role: 'user', parts: [{ text: testUserInput }] };
    setIsThinking(true);
    setTestUserInput('');

    const currentSession = sessionMemory.get(activeTestUserId) || { history: [], lastActive: 0 };
    const updatedHistory = [...currentSession.history, userTurn];
    
    if (updatedHistory.length > MAX_HISTORY_TURNS) {
      updatedHistory.splice(0, updatedHistory.length - MAX_HISTORY_TURNS);
    }

    const updatedSession: AgentSession = { history: updatedHistory, lastActive: Date.now() };
    setSessionMemory(prev => new Map(prev).set(activeTestUserId, updatedSession));
    
    try {
        const agentResponseText = await getWhatsappAgentResponse(testUserInput, updatedHistory, knowledgeBase, systemPrompt);
        const modelTurn: GeminiChatTurn = { role: 'model', parts: [{ text: agentResponseText }] };

        setSessionMemory(prev => {
            const finalSession = prev.get(activeTestUserId);
            if(finalSession){
                return new Map(prev).set(activeTestUserId, {
                    ...finalSession,
                    history: [...finalSession.history, modelTurn],
                    lastActive: Date.now()
                });
            }
            return prev;
        });

    } catch (error) {
        console.error("Agent response error:", error);
        const errorTurn: GeminiChatTurn = { role: 'model', parts: [{ text: "Sorry, an error occurred while getting a response." }] };
        setSessionMemory(prev => {
            const finalSession = prev.get(activeTestUserId);
             if(finalSession){
                return new Map(prev).set(activeTestUserId, {
                    ...finalSession,
                    history: [...finalSession.history, errorTurn],
                    lastActive: Date.now()
                });
            }
            return prev;
        });
    } finally {
        setIsThinking(false);
    }
  }, [testUserInput, isThinking, activeTestUserId, sessionMemory, knowledgeBase, systemPrompt]);

  const handleExpireSession = (userId: string) => {
    setSessionMemory(prev => {
      const newMemory = new Map(prev);
      newMemory.delete(userId);
      return newMemory;
    });
  };

  const handleResetActiveSession = () => {
    if (activeTestUserId) {
        handleExpireSession(activeTestUserId);
    }
  };

  const activeUserHistory = sessionMemory.get(activeTestUserId)?.history || [];
  const activeSessions = Array.from(sessionMemory.entries());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Configuration</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Enable WhatsApp Agent</h3>
                <p className="text-sm text-gray-500">When enabled, the agent will automatically respond.</p>
              </div>
              <label htmlFor="agentToggle" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" id="agentToggle" className="sr-only" checked={isAgentEnabled} onChange={() => setIsAgentEnabled(!isAgentEnabled)} />
                  <div className={`block w-14 h-8 rounded-full ${isAgentEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-md ${isAgentEnabled ? 'transform translate-x-6' : ''}`}></div>
                </div>
              </label>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Agent Personality (System Prompt)</h3>
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full bg-gray-50 text-gray-800 p-3 rounded-md h-32 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <button onClick={handleSaveSettings} className="px-4 py-2 w-32 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400" disabled={saveStatus !== 'idle'}>
                {saveStatus === 'idle' && 'Save Settings'}
                {saveStatus === 'saving' && <LoadingIcon />}
                {saveStatus === 'saved' && 'Saved!'}
              </button>
              <p className="text-xs text-gray-400 mt-2">Note: Saving requires backend changes.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sessions ({activeSessions.length})</h2>
            <p className="text-xs text-gray-400 mb-4">Sessions expire after 15 minutes of inactivity.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {activeSessions.length > 0 ? activeSessions.map(([userId, session]) => (
                    <div key={userId} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div>
                            <p className="font-medium text-gray-800 text-sm">{userId}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5"><ClockIcon/> Last active: {new Date(session.lastActive).toLocaleTimeString()}</p>
                        </div>
                        <button onClick={() => handleExpireSession(userId)} className="p-2 text-gray-500 hover:text-red-600" title="End Session">
                            <DeleteIcon />
                        </button>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 text-center py-4">No active sessions.</p>
                )}
            </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Agent Tester</h2>
                 <button onClick={handleResetActiveSession} className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700 hover:bg-red-600 hover:text-white transition-colors" disabled={!activeTestUserId || activeUserHistory.length === 0}>
                    Reset Session
                </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
                <label htmlFor="user-id-input" className="text-sm font-medium text-gray-600">Test as User ID:</label>
                <input 
                    id="user-id-input"
                    type="text"
                    value={activeTestUserId}
                    onChange={(e) => setActiveTestUserId(e.target.value)}
                    className="flex-1 w-full sm:w-auto px-3 py-1.5 text-sm text-gray-800 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            
            <div className="h-96 bg-gray-50 rounded-lg flex flex-col p-4 border border-gray-200">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {activeUserHistory.map((turn, index) => (
                        <div key={index} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl max-w-lg shadow-sm ${turn.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                {turn.parts[0].text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                         <div className="flex justify-start">
                             <div className="px-4 py-2 rounded-2xl max-w-lg bg-gray-200 text-gray-800 rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                </div>
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-4 flex items-center">
                    <input
                        type="text"
                        value={testUserInput}
                        onChange={(e) => setTestUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Send a message..."
                        className="flex-1 bg-white text-gray-800 px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                        disabled={isThinking || !activeTestUserId}
                    />
                    <button onClick={handleSendMessage} disabled={isThinking || !testUserInput.trim() || !activeTestUserId} className="ml-3 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isThinking ? <LoadingIcon /> : <SendIcon />}
                    </button>
                </div>
            </div>
        </div>
        
        <KnowledgeBase />
      </div>
    </div>
  );
};

export default WhatsAppAgent;