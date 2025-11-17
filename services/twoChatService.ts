import { TCConversation, TCMessage } from '../types';
import { makeRequest } from './googleSheetService';

async function makeTwoChatRequest<T>(subAction: string, payload?: any): Promise<T> {
  const requestBody = {
    action: '2chat', // Tells our Apps Script to use the proxy handler
    subAction,       // The specific 2Chat function to call
    payload,         // Any data needed, e.g., conversationId or message content
  };
  
  // The central makeRequest function handles the full fetch, error handling, and JSON parsing.
  // It will throw an error if the request fails, which will be caught by the calling function.
  try {
    return await makeRequest(requestBody);
  } catch (error) {
    console.error(`2Chat Service Error (via proxy for ${subAction}):`, error);
    throw error;
  }
}

export const fetchConversations = async (): Promise<TCConversation[]> => {
    const response = await makeTwoChatRequest<{ conversations: TCConversation[] }>('fetchConversations');
    return Array.isArray(response?.conversations) ? response.conversations : [];
};

export const fetchMessages = async (conversationId: string): Promise<TCMessage[]> => {
    const response = await makeTwoChatRequest<{ messages: TCMessage[] }>('fetchMessages', { conversationId });
    return Array.isArray(response?.messages) ? response.messages : [];
};

export const sendMessage = async (to: string, text: string): Promise<TCMessage> => {
    const payload = { to, text };
    const response = await makeTwoChatRequest<{ message: TCMessage }>('sendMessage', payload);
    if (!response?.message?.id) {
        throw new Error("Failed to send message: Invalid response from API.");
    }
    return response.message;
};