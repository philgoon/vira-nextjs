import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Server-side cache to minimize API calls.
const cache = new Map();
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function getAuth() {
  try {
    // Check if environment variables are set
    if (!process.env.GOOGLE_PRIVATE_KEY_BASE64) {
      console.error('GOOGLE_PRIVATE_KEY_BASE64 environment variable is not set');
      throw new Error('Missing Google private key');
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.error('GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable is not set');
      throw new Error('Missing Google service account email');
    }

    // Try to decode the base64 private key
    let privateKey;
    try {
      privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
      
      // Check if we have a JSON object (service account key file)
      if (privateKey.includes('"private_key":')) {
        // Extract just the private key from the JSON
        const keyFile = JSON.parse(privateKey);
        privateKey = keyFile.private_key;
      }
    } catch (decodeError) {
      console.error('Failed to decode private key:', decodeError);
      throw new Error('Invalid private key format');
    }

    return new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

const sheets = google.sheets({ version: 'v4', auth: getAuth() });

/**
 * Reads all data from a sheet and converts it to an array of objects.
 * @param {string} sheetName The name of the sheet to read (e.g., 'Vendors').
 * @param {boolean} forceRefresh Ignore cache and fetch fresh data.
 * @returns {Promise<Array<Object>>} An array of objects representing rows.
 */
export async function getSheetData(sheetName, forceRefresh = false) {
  const cachedData = cache.get(sheetName);
  if (cachedData && !forceRefresh && (new Date() - cachedData.timestamp < CACHE_TIMEOUT)) {
    console.log(`CACHE HIT: Returning cached data for sheet "${sheetName}"`);
    return cachedData.data;
  }
  
  console.log(`CACHE MISS: Fetching fresh data for sheet "${sheetName}"`);

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: sheetName,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    const headers = rows[0];
    const data = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    cache.set(sheetName, { data, timestamp: new Date() });
    return data;
  } catch (error) {
    console.error(`Error fetching sheet "${sheetName}":`, error.message);
    throw new Error('Failed to fetch data from Google Sheets.');
  }
}
