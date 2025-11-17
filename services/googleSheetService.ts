import { SheetRow } from '../types';

// ====================================================================================
// ====================================================================================
//
//    ACTION REQUIRED: 
//    1. Deploy your new, unified Google Apps Script.
//    2. Copy the Web App URL.
//    3. Paste the URL here to connect the frontend to your backend.
//
// ====================================================================================
// ====================================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAJ94P4NbnnXM48ALNHcUusZsf5GwSs8OFZ_Jx7XvllHav3q1I9YgeRdXASodV1jPi7g/exec';

export const getScriptUrl = (): string => {
  return SCRIPT_URL;
};

/**
 * A robust, unified function to make all POST requests to the Google Apps Script.
 * It handles sheet operations (create, update, delete) and proxy requests for the 2Chat API.
 */
export async function makeRequest(body: object): Promise<any> {
  if (SCRIPT_URL.includes('PASTE_YOUR')) {
    const errorMessage = "CONFIGURATION ERROR: Please paste your new Google Apps Script URL into services/googleSheetService.ts";
    alert(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Required by Apps Script
      },
      body: JSON.stringify(body),
      redirect: 'follow', // Standard for Apps Script web apps
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const text = await response.text();
    const result = JSON.parse(text);

    // Check for errors returned by our script's logic
    if (result.status === 'error') {
      throw new Error(`Google Apps Script Error: ${result.message}`);
    }
    
    // With the unified backend, the response is always wrapped in a `data` property.
    return result.data;

  } catch (error) {
    console.error(`Google Sheet Service Error:`, error);
    // Rethrow the error so the calling component can handle it (e.g., show an error message)
    throw error;
  }
}

// --- Sheet-Specific Functions ---

/**
 * FIX: Reverted to a GET request to resolve "Invalid POST action: 'read'" error.
 * The Google Apps Script backend is configured to handle read operations via doGet,
 * so this function constructs a URL with query parameters and uses the GET method.
 */
export const fetchData = async <T extends SheetRow>(sheetName: string): Promise<T[]> => {
    if (SCRIPT_URL.includes('PASTE_YOUR')) {
        const errorMessage = "CONFIGURATION ERROR: Please paste your new Google Apps Script URL into services/googleSheetService.ts";
        alert(errorMessage);
        throw new Error(errorMessage);
    }
    
    const url = new URL(SCRIPT_URL);
    url.searchParams.append('action', 'read');
    url.searchParams.append('sheetName', sheetName);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok. Status: ${response.status}`);
        }

        const text = await response.text();
        const result = JSON.parse(text);

        if (result.status === 'error') {
            throw new Error(`Google Apps Script Error: ${result.message}`);
        }
        
        return result.data as T[];
    } catch (error) {
        console.error(`Google Sheet Service Error (fetchData for ${sheetName}):`, error);
        throw error;
    }
};

export const createRow = async (sheetName: string, rowData: Partial<SheetRow>): Promise<any> => {
    return makeRequest({ action: 'create', sheetName, payload: rowData });
};

export const updateRow = async (sheetName: string, rowData: SheetRow): Promise<any> => {
    return makeRequest({ action: 'update', sheetName, payload: rowData });
};

export const deleteRow = async (sheetName: string, rowIndex: number): Promise<any> => {
    return makeRequest({ action: 'delete', sheetName, payload: { rowIndex } });
};

// NEW: Function to handle file uploads via Apps Script
export const uploadFile = async (fileName: string, mimeType: string, data: string): Promise<{ url: string }> => {
    // The makeRequest function returns the `data` property of the script's response,
    // which we expect to be an object like { url: '...' } upon success.
    return makeRequest({
        action: 'uploadFile',
        payload: { fileName, mimeType, data },
    });
};