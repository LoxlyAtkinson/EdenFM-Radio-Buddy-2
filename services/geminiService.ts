

import { GoogleGenAI, Modality, FunctionDeclaration, Type } from '@google/genai';
import { GeminiChatTurn, GroundedNewsResponse, GroundingChunk } from '../types';

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey });
};

// For complex queries analyzing spreadsheet data
export const getComplexResponse = async (prompt: string, context: any): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-pro';
    
    const fullPrompt = `
        You are Eden FM buddy, an AI assistant for a radio station DJ.
        Your task is to answer questions based ONLY on the following data from our spreadsheets in JSON format.
        Do not make up information. If the answer isn't in the data, say so.
        Analyze the data to provide insights. Today's date is ${new Date().toLocaleDateString()}.

        ---
        DATA ANALYSIS RULES:
        1.  **Request Prioritization**: When asked about priorities, use this logic:
            - **High Priority**: 'Occasion' is 'Birthday' or 'Anniversary'.
            - **Medium Priority**: A non-empty 'Dedication to' field that is not high priority.
            - **Low Priority**: Standard request with no occasion or dedication.
        2.  **Registration Analytics**: When asked about registrations per show, you MUST cross-reference the registration 'Timestamp' with the 'Start' and 'End' times from the Radio Schedule data to determine which show was on air when the user registered. You can also analyze registrations by 'Area'.
        3.  **Popularity**: When asked about "popular" songs or "top areas", count the occurrences in the respective datasets.
        4.  **Date Filtering**: For questions about 'today', filter data by the 'Timestamp' or 'Date' column matching today's date.
        
        ---
        Here is the live station data:
        ---
        [RADIO SCHEDULE]
        This is the weekly schedule. Use it to determine which show is on at a given time. Note the 'Start' and 'End' times.
        ${JSON.stringify(context.schedule, null, 2)}
        [/RADIO SCHEDULE]
        ---
        [REGISTRATIONS DATA]
        This contains user registration information.
        ${JSON.stringify(context.registrations, null, 2)}
        [/REGISTRATIONS DATA]
        ---
        [SONG REQUESTS DATA]
        This contains listener song requests.
        ${JSON.stringify(context.requests, null, 2)}
        [/SONG REQUESTS DATA]
        ---
        [ANNOUNCEMENTS/NEWS DATA]
        ${JSON.stringify(context.announcements, null, 2)}
        [/ANNOUNCEMENTS/NEWS DATA]
        ---

        Now, please answer this question from the DJ: "${prompt}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API Error (Complex Response):", error);
        return "Sorry, I had trouble analyzing the data. Please try again.";
    }
};

// For simple, conversational queries
export const getSimpleResponse = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';
    
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API Error (Simple Response):", error);
        return "Sorry, I'm having trouble connecting right now.";
    }
};

// For Text-to-Speech
export const textToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash-preview-tts';

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Gemini TTS Error:", error);
        throw new Error("Failed to generate speech from text.");
    }
};

// For audio transcription
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';

    try {
        const audioPart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Audio,
            },
        };
        const textPart = { text: "Transcribe this audio." };
        
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [audioPart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Transcription Error:", error);
        return "Failed to transcribe audio.";
    }
};

// NEW: For fetching local news with Google Search grounding
export const getGroundedNews = async (location: string, customSources?: string[]): Promise<GroundedNewsResponse> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-flash';

    let prompt = `Fetch the top 3-5 local news headlines for ${location}, Western Cape, South Africa. For each headline, provide a bold title and a one-or-two-sentence summary. After each summary, you MUST cite the source. To do this, add 'Source:' followed by the direct, public-facing URL of the source article (e.g., 'https://www.news24.com/article/123'). Do NOT use any redirect URLs (like those from vertexaisearch.cloud.google.com or other services). The URL must be the final destination link. Separate each news item with a double newline.`;

    if (customSources && customSources.length > 0) {
        prompt += ` Prioritize results from the following trusted news sources if possible: ${customSources.join(', ')}.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const summary = response.text;
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

        return { summary, sources: sources as GroundingChunk[] };
    } catch (error) {
        console.error(`Gemini Grounded News Error for location "${location}":`, error);
        throw new Error(`Failed to fetch news for ${location}.`);
    }
};


// --- WhatsApp Agent Backend Blueprint ---

const agentTools: FunctionDeclaration[] = [
    {
        name: 'capture_song_request',
        description: "Captures a listener's song request and dedication. Ask clarifying questions to get all required information before calling this tool.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                requesterName: { type: Type.STRING, description: "The name of the person making the request. You must ask for this." },
                songRequested: { type: Type.STRING, description: "The title and artist of the song being requested." },
                dedicationTo: { type: Type.STRING, description: "The name of the person the dedication is for. Optional." },
                occasion: { type: Type.STRING, description: "The special occasion for the request (e.g., Birthday, Anniversary). Optional." },
            },
            required: ['requesterName', 'songRequested'],
        },
    },
    {
        name: 'register_new_user',
        description: "Registers a new listener with the radio station. Ask clarifying questions to get all required information before calling this tool.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "The first name of the user." },
                surname: { type: Type.STRING, description: "The last name of the user." },
                area: { type: Type.STRING, description: "The geographical area or suburb where the user lives." },
            },
            required: ['name', 'surname', 'area'],
        },
    },
    {
        name: 'answer_from_knowledge_base',
        description: "Answers a general question using the station's knowledge base.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                answer: { type: Type.STRING, description: "The concise answer to the user's question, formulated from the knowledge base." },
            },
            required: ['answer'],
        },
    },
    {
        name: 'forward_to_dj',
        description: "Use this function when the user's query cannot be handled by other tools, if the user seems frustrated, or when they explicitly ask to speak to a human DJ.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                reason: { type: Type.STRING, description: "A brief summary of why the conversation is being forwarded." },
            },
            required: ['reason'],
        },
    },
];

export const getWhatsappAgentResponse = async (
    userMessage: string,
    conversationHistory: GeminiChatTurn[],
    knowledgeBase: any[],
    systemPrompt: string
): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-2.5-pro'; // Pro is better for complex function calling

    const fullPrompt = `
        CONTEXT:
        1. Knowledge Base: You have access to the following information about the radio station. Use it to answer general questions. If the answer is not in the knowledge base, say you don't know.
        ${JSON.stringify(knowledgeBase, null, 2)}
        
        INSTRUCTIONS:
        - Your personality is defined by the following system prompt: "${systemPrompt}"
        - Analyze the user's message in the context of the conversation history.
        - Your primary goal is to use one of the available tools to handle the user's request.
        - If the user asks a general question, find the answer in the knowledge base and use the 'answer_from_knowledge_base' tool.
        - If the user wants to request a song, collect all necessary details (ask clarifying questions if needed) and then use the 'capture_song_request' tool.
        - If the user wants to register, collect all necessary details and use the 'register_new_user' tool.
        - If you cannot handle the request or the user asks for a person, use the 'forward_to_dj' tool.
        - Do not make up information. If a required piece of information for a tool is missing, you MUST ask the user for it before calling the tool.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [
                ...conversationHistory,
                { role: 'user', parts: [{ text: userMessage }] }
            ],
            config: {
                systemInstruction: fullPrompt,
                tools: [{ functionDeclarations: agentTools }],
            },
        });

        // In a real backend, you would now process `response.functionCalls`
        // and execute the corresponding Google Sheet actions.
        // For this frontend blueprint, we'll just return a descriptive string.
        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            return `[AGENT ACTION]: Called function '${fc.name}' with args: ${JSON.stringify(fc.args)}`;
        } else {
            return response.text; // A direct text response from the model
        }

    } catch (error) {
        console.error("Gemini Agent Error:", error);
        return "Sorry, the agent encountered an error.";
    }
};