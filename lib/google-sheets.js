import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// [R1]: Centralized Google Sheets connection management
let doc;
let sheets = {};
let isInitialized = false;

/**
 * [R1, R4]: Initializes the Google Spreadsheet connection using service account credentials.
 * Caches the connection and sheet objects to avoid re-authentication on every call.
 */
async function initializeSheet() {
  // [SF]: Use a simple flag to prevent re-initialization.
  if (isInitialized) {
    return;
  }

  try {
    // [R4]: Authenticate using environment variables.
    if (!process.env.GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set.');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set.');
    if (!process.env.GOOGLE_PRIVATE_KEY_BASE64) throw new Error('GOOGLE_PRIVATE_KEY_BASE64 is not set.');

    const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

    await doc.loadInfo();

    // [R1]: Map sheet titles to a simple object for easy access.
    const sheetTitles = ['Vendors', 'Projects', 'Clients', 'Ratings'];
    for (const title of sheetTitles) {
      const sheet = doc.sheetsByTitle[title];
      if (!sheet) {
        // [REH]: Provide a clear error message if a required sheet is missing.
        throw new Error(`Sheet "${title}" not found. Please ensure it exists in the Google Sheet document.`);
      }
      sheets[title.toLowerCase()] = sheet;
    }
    
    isInitialized = true;
    console.log('Google Sheets connection initialized successfully.');

  } catch (error) {
    console.error('Error initializing Google Sheets:', error.message);
    // [REH]: Propagate a user-friendly error to the caller.
    throw new Error('Failed to connect to Google Sheets. Check credentials and sheet configuration.');
  }
}

// [R2]: Helper to get the primary key column for a given sheet.
function getIdColumn(sheetName) {
  const idColumns = {
    vendors: 'vendor_id',
    projects: 'project_id',
    clients: 'client_id',
    ratings: 'rating_id',
  };
  return idColumns[sheetName];
}

// [R2]: Helper to get the ID prefix for a given sheet.
function getIdPrefix(sheetName) {
  const prefixes = {
    vendors: 'VEN-',
    projects: 'PRJ-',
    clients: 'CLI-',
    ratings: 'R',
  };
  return prefixes[sheetName];
}

/**
 * [R5]: Reads all rows from a specified sheet.
 * @param {string} sheetName - The name of the sheet (e.g., 'vendors').
 * @returns {Promise<Array<Object>>} - An array of objects representing the rows.
 */
export async function readAllRows(sheetName) {
  await initializeSheet(); // [R1]: Ensure connection is established.
  try {
    const sheet = sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" is not a valid sheet.`);
    const rows = await sheet.getRows();
    return rows.map(row => row.toObject());
  } catch (error) {
    console.error(`Error reading from sheet "${sheetName}":`, error.message);
    throw new Error(`Could not read data from ${sheetName}.`);
  }
}

/**
 * [R5]: Finds a single row by a specific column value.
 * @param {string} sheetName - The name of the sheet.
 * @param {string} columnName - The name of the column to search.
 * @param {*} value - The value to find.
 * @returns {Promise<Object|null>} - The found row object or null.
 */
export async function findRowByValue(sheetName, columnName, value) {
  const rows = await readAllRows(sheetName);
  return rows.find(row => row[columnName] === value) || null;
}

/**
 * [R6]: Generates the next sequential ID for a new row.
 * @param {string} sheetName - The name of the sheet.
 * @returns {Promise<string>} - The new ID string (e.g., 'VEN-0012').
 */
export async function generateNextId(sheetName) {
  const rows = await readAllRows(sheetName);
  const idColumn = getIdColumn(sheetName);
  const prefix = getIdPrefix(sheetName);

  const highestNum = rows.reduce((max, row) => {
    const id = row[idColumn];
    if (id && id.startsWith(prefix)) {
      const num = parseInt(id.replace(prefix, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }
    return max;
  }, 0);

  // [SF]: Simple padding for consistent ID format.
  const nextNum = (highestNum + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
}

/**
 * [R5]: Adds a new row to the specified sheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {Object} rowData - The data for the new row.
 * @returns {Promise<Object>} - The newly created row object.
 */
export async function addRow(sheetName, rowData) {
  await initializeSheet();
  try {
    const sheet = sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);

    // [R6]: Generate ID if not provided.
    const idColumn = getIdColumn(sheetName);
    if (!rowData[idColumn]) {
      rowData[idColumn] = await generateNextId(sheetName);
    }

    rowData.created_date = new Date().toISOString();

    const newRow = await sheet.addRow(rowData);
    return newRow.toObject();
  } catch (error) {
    console.error(`Error adding row to "${sheetName}":`, error.message);
    throw new Error(`Failed to create new record in ${sheetName}.`);
  }
}

/**
 * [R5]: Updates an existing row identified by its ID.
 * @param {string} sheetName - The name of the sheet.
 * @param {string} id - The ID of the row to update.
 * @param {Object} updateData - An object with the fields to update.
 * @returns {Promise<Object>} - The updated row object.
 */
export async function updateRow(sheetName, id, updateData) {
  await initializeSheet();
  try {
    const sheet = sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
    
    const idColumn = getIdColumn(sheetName);
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(row => row.get(idColumn) === id);

    if (!rowToUpdate) {
      throw new Error(`Record with ID ${id} not found in ${sheetName}.`);
    }

    // [SF]: Iterate over keys in updateData to apply changes.
    Object.keys(updateData).forEach(key => {
      if (key !== idColumn) { // Prevent changing the ID
        rowToUpdate.set(key, updateData[key]);
      }
    });

    await rowToUpdate.save();
    return rowToUpdate.toObject();
  } catch (error) {
    console.error(`Error updating record ${id} in "${sheetName}":`, error.message);
    throw new Error(`Failed to update record in ${sheetName}.`);
  }
}

/**
 * [R7]: Checks for dependent records before allowing a deletion.
 * @param {string} sheetName - The name of the sheet for the record being deleted.
 * @param {string} id - The ID of the record being deleted.
 */
async function checkRelationships(sheetName, id) {
  if (sheetName === 'vendors') {
    const projects = await readAllRows('projects');
    const activeProjects = projects.filter(p => p.assigned_vendor_id === id && p.status === 'active');
    if (activeProjects.length > 0) {
      throw new Error(`Cannot delete vendor: ${activeProjects.length} active project(s) are assigned.`);
    }
  }

  if (sheetName === 'clients') {
    const projects = await readAllRows('projects');
    const activeProjects = projects.filter(p => p.client_id === id && p.status === 'active');
    if (activeProjects.length > 0) {
      throw new Error(`Cannot delete client: Client is associated with ${activeProjects.length} active project(s).`);
    }
  }

  if (sheetName === 'projects') {
    const ratings = await readAllRows('ratings');
    const projectRatings = ratings.filter(r => r.project_id === id);
    if (projectRatings.length > 0) {
      throw new Error(`Cannot delete project: ${projectRatings.length} rating(s) exist for this project.`);
    }
  }
}

/**
 * [R5, R7]: Deletes a row after checking for relationships.
 * @param {string} sheetName - The name of the sheet.
 * @param {string} id - The ID of the row to delete.
 * @returns {Promise<Object>} - A success message.
 */
export async function deleteRow(sheetName, id) {
  await initializeSheet();
  try {
    // [R7]: Prevent deletion of records with dependencies.
    await checkRelationships(sheetName, id);

    const sheet = sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
    
    const idColumn = getIdColumn(sheetName);
    const rows = await sheet.getRows();
    const rowToDelete = rows.find(row => row.get(idColumn) === id);

    if (!rowToDelete) {
      throw new Error(`Record with ID ${id} not found in ${sheetName}.`);
    }

    await rowToDelete.delete();
    return { success: true, message: `Record ${id} from ${sheetName} deleted successfully.` };
  } catch (error) {
    console.error(`Error deleting record ${id} from "${sheetName}":`, error.message);
    // [REH]: Re-throw specific, actionable errors.
    if (error.message.startsWith('Cannot delete')) {
      throw error;
    }
    throw new Error(`Failed to delete record from ${sheetName}.`);
  }
}

export function validateVendorData(data) {
  const errors = [];
  
  if (!data.vendor_name || data.vendor_name.trim().length < 2) {
    errors.push('Vendor name must be at least 2 characters');
  }
  
  if (!data.contact_email || !isValidEmail(data.contact_email)) {
    errors.push('Valid contact email is required');
  }
  
  if (!data.service_categories || data.service_categories.length === 0) {
    errors.push('At least one service category is required');
  }
  
  if (!['Active', 'Testing', 'Inactive'].includes(data.status)) {
    errors.push('Status must be Active, Testing, or Inactive');
  }

  const allowedCategories = [
    'content', 'graphic_design', 'seo', 'proofreading', 
    'social_media', 'paid_media', 'web_development', 'data_analytics'
  ];
  
  const categories = Array.isArray(data.service_categories) 
    ? data.service_categories 
    : data.service_categories.split('|');
    
  const invalidCategories = categories.filter(cat => !allowedCategories.includes(cat));
  if (invalidCategories.length > 0) {
    errors.push(`Invalid service categories: ${invalidCategories.join(', ')}`);
  }
  
  return errors;
}

function isValidEmail(email) {
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


