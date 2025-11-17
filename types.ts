export interface SheetRow {
  rowIndex: number;
  [key: string]: any;
}

// UPDATE: Added isRead property for local state management
export interface SongRequest extends SheetRow {
  Date: string;
  Time: string;
  Show: string;
  'Requester Name': string;
  Whatsapp: string;
  'Request type': string;
  'Show preferrence': string;
  'Song requested': string;
  'Dedication to': string;
  Occasion: string;
  Done: string;
  Priority: string;
  readAt?: string; // ISO timestamp for when the request was marked as read
}

export interface Registration extends SheetRow {
  // FIX: Replaced 'Timestamp' with the actual columns from the sheet.
  'Registration Date': string;
  'Registration Time': string;
  Name: string;
  Surname: string;
  'Date of Birth': string;
  Area: string;
  'Contact Number': string;
  Email: string;
  ReferredByCode: string;
}

export interface NewsItem extends SheetRow {
    Date: string;
    Title: string;
    Content: string;
    Category: string;
    MediaURL?: string;
}

// UPDATE: Added 'Day' to align with backend data transformation for analytics.
export interface RadioShow extends SheetRow {
    'Day(s) of Week'?: string; // The raw value from the sheet
    Day?: string; // The expanded, comma-separated full day names from the backend script
    Show: string;
    Presenter: string;
    'Start': string;
    'End': string;
    Aliases?: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  isThinking?: boolean;
}

export interface GeminiMediaBlob {
  data: string;
  mimeType: string;
}

// UPDATE: Updated for dropdown filters
export type FilterType = 'text' | 'dropdown';

export interface FilterConfig<T extends SheetRow> {
    column: keyof T;
    type: FilterType;
    options?: { value: string; label: string }[]; // Options for dropdown
}

export interface TCMessage {
  id: string;
  text: string;
  from_me: boolean;
  created_at: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker';
  media_url?: string;
  ack?: number;
}

export interface TCConversation {
    id: string;
    name: string;
    avatar: string;
    last_message_text: string;
    last_message_at: string;
    unread_messages: number;
}

// NEW: For the WhatsApp Agent's knowledge base
export interface KnowledgeBaseItem extends SheetRow {
  Topic: string;
  Information: string;
}

// NEW: For passing conversation history to the agent
export interface GeminiChatTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// NEW: For managing WhatsApp Agent's conversation sessions
export interface AgentSession {
  history: GeminiChatTurn[];
  lastActive: number; // JS timestamp (Date.now())
}

// NEW: For Google Search grounded news results
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundedNewsResponse {
  summary: string;
  sources: GroundingChunk[];
}

// NEW: For DataTable column configuration to allow custom input types
export interface DataTableColumn<T extends SheetRow> {
  key: keyof T;
  label: string;
  inputType?: 'text' | 'daysOfWeek';
}