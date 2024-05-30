const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

const config = require(CONFIG_PATH);

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth, school) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `'${school}'!A1:AP`,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  }

  let data = [];
  
  // get headers from first row
  // remove first row from rows
  let headers = rows[0];
  rows.shift();

  // remove all trailing spaces from headers
  headers = headers.map(header => header.trim());

  // rename first found "waistline" and "hips" to "waistline (pants)" and "hips (paints)"
  // rename second "waisteline" and "hips" to "waistline (skirt)" and "hips (skirt)"
  headers[headers.indexOf('Hips')] = 'Hips (Top)';
  headers[headers.indexOf('Waistline')] = 'Waistline (Pants)';
  headers[headers.indexOf('Hips')] = 'Hips (Pants)';
  headers[headers.indexOf('Waistline')] = 'Waistline (Skirt)';
  headers[headers.indexOf('Hips')] = 'Hips (Skirt)';
  headers[headers.indexOf('Other Remarks')] = 'Other Remarks (Top)';
  headers[headers.indexOf('Other Remarks')] = 'Other Remarks (Pants)';
  headers[headers.indexOf('Other Remarks')] = 'Other Remarks (Skirt)';
  headers[headers.indexOf('for Senior High, strand')] = 'Strand';

  // get data from rest of rows
  // make each row an object with key from headers
  rows.forEach(row => {
    let obj = {};
    row.forEach((cell, i) => {
      obj[headers[i]] = cell;
    });
    data.push(obj);
  });

  return data;
}

const getData =  async function(school) {
  let data = null;
  await authorize().then(async auth => {
    data = await listMajors(auth, school)
  }).catch(console.error);

  return data;
}

exports.getData = getData;