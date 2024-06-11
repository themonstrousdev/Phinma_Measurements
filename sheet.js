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
const TOKEN_PATH = path.join(process.cwd(), '/confidentials/token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), '/confidentials/credentials.json');

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
async function authorize(renew = false) {
  let client = null;
  
  if(!renew) {
    client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
  } else {
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  }
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth, school, page = 1, date = null, search = null) {
  const orders = 15;
  let startRow = 2 + (page - 1) * orders;
  let endRow = startRow + orders - 1;

  if(date) {
    startRow = 2;
    endRow = "";
    let dateString = new Date(date);
    let month = dateString.getMonth() + 1;
    let day = dateString.getDate();
    let year = dateString.getFullYear();

    date = `${month}/${day}/${year}`;
  }

  if(search) {
    startRow = 2;
    endRow = "";
  }


  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.readSheetId,
    range: `'${school}'!A${startRow}:AW${endRow}`,
  });


  if(date) {
    // find the orders based on page
    let orderRows = res.data.values;
    orderRows = orderRows.filter(row => row[0].includes(date));
    let start = (page - 1) * orders;
    let end = start + orders - 1;

    res.data.values = orderRows.slice(start - 2, end + 1);
  }

  if(search) {
    let orderRows = res.data.values;
    orderRows = orderRows.filter(row => row.some(cell => cell.toLowerCase().includes(search.toLowerCase())));
    let start = (page - 1) * orders;
    let end = start + orders - 1;

    res.data.values = orderRows.slice(start - 2, end + 1);
  }


  let headers = await sheets.spreadsheets.values.get({
    spreadsheetId: config.readSheetId,
    range: `'${school}'!1:1`,
  });

  headers = headers.data.values[0];

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return {empty: true, page};
  }

  let totalRows = await sheets.spreadsheets.values.get({
    spreadsheetId: config.readSheetId,
    range: `'${school}'!A:A`,
  });


  totalRows = totalRows.data.values;

  if(date) {
    totalRows = totalRows.filter(row => row[0].includes(date));
  }

  if(search) {
    totalRows = totalRows.filter(row => row.some(cell => cell.toLowerCase().includes(search.toLowerCase())));
  }

  totalRows = totalRows.length - 1;

  let totalPages = Math.ceil(totalRows / orders);

  let data = [];
  
  // get headers from first row
  // remove first row from rows

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

  // find header that says sleeve length
  // rename it to just "Sleeve Length"
  let sleeveLengthIndex = headers.findIndex(header => header.toLowerCase().startsWith("sleeve length"));
  headers[sleeveLengthIndex] = "Sleeve Length";

  // find header that starts with "BL"
  // rename it to just "BL"
  let blIndex = headers.findIndex(header => header.startsWith("BL"));
  headers[blIndex] = "BL";

  // get data from rest of rows
  // make each row an object with key from headers
  rows.forEach(row => {
    let obj = {};
    row.forEach((cell, i) => {
      obj[headers[i]] = cell;
    });
    data.push(obj);
  });

  return {data, headers, totalPages};
}

function getLastColumn(headers) {
  let alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if(headers.length <= alpha.length) {
    return alpha[headers.length - 1];
  } else {
    let first = alpha[Math.floor(headers.length / alpha.length) - 1];
    let second = alpha[headers.length % alpha.length - 1];
    return `${first}${second}`;
  }
}

async function doneOrder(auth, school, row) {
  const sheets = google.sheets({version: 'v4', auth});

  let headers = await sheets.spreadsheets.values.get({
    spreadsheetId: config.readSheetId,
    range: `'${school}'!1:1`,
  });

  headers = headers.data.values[0];

  headers = headers.map(header => header.trim());

  let lastColumn = getLastColumn(headers);

  try {
    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: config.writeSheetId,
      range: `'${school}'!${lastColumn}${row}:${lastColumn}${row}`,
      valueInputOption: 'RAW',
      resource: {
        values: [["Done"]]
      }
    });

    return result.data.updatedCells;
  } catch (err) {
    console.log(err)
    return null;
  }
}

const getData =  async function(school, page, date) {
  let data = null;
  await authorize().then(async auth => {
    data = await listMajors(auth, school, page, date)
  }).catch(async err => {
    console.log(err);
    await renewToken();
    data = {tokenRenewed: true}
  });

  return data;
}

const finishOrder = async function(school, row) {
  let result = null;
  await authorize().then(async auth => {
    result = await doneOrder(auth, school, row);
  }).catch(console.error);

  return result;
}

const renewToken = async function() {
  // delete contents of token.json
  await fs.writeFile(TOKEN_PATH, "");

  // authorize again
  await authorize(true);
}

// check if authorize function returns an error
// if it does, call renewToken function
const checkToken = async function() {
  await authorize().catch(async err => {
    console.log(err)
    await renewToken();
  });
}

exports.checkToken = checkToken;
exports.getData = getData;
exports.finishOrder = finishOrder;