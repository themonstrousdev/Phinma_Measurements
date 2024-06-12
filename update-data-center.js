const checkToken = require("./sheet").checkToken;
const authorize = require("./sheet").authorize
const path = require('path');
const process = require('process');
const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const {google} = require('googleapis');

const config = require(CONFIG_PATH);

const excelRows = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC',
  'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK',
  'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS',
  'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA',
  'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ',
  'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY',
  'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG',
  'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO',
  'CP', 'CQ', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW',
  'CX', 'CY', 'CZ', 'DA', 'DB', 'DC', 'DD', 'DE',
  'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM',
  'DN', 'DO', 'DP', 'DQ', 'DR', 'DS', 'DT', 'DU',
  'DV', 'DW', 'DX', 'DY', 'DZ', 'EA', 'EB', 'EC',
]

checkToken().then(() => {
  // go through each sheet in the write file
  // get the heaaders only
  // get value of the first cell in the read file
  // compare the number of headers and the first Col number in the first cell
  // if they are not equal, print the sheet name

  authorize
    .then(async (auth) => {
      const workbook = google.sheets({version: 'v4', auth});

      // loop through tabs
      const sheets = await workbook.spreadsheets.get({
        spreadsheetId: config.writeSheetId
      });

      sheets.data.sheets.forEach(async (sheet) => {
        let headers = await workbook.spreadsheets.values.get({
          spreadsheetId: config.writeSheetId,
          range: `'${sheet.properties.title}'!1:1`
        });

        
        let firstCell = null;
        
        await workbook.spreadsheets.values.get({
          spreadsheetId: config.readSheetId,
          range: `'${sheet.properties.title}'!A1`
        }).then((res) => {
          firstCell = res;
        }).catch(err => {
          console.log(err);
          // check message if "Unable to parse range"
          if(err.message === `Unable to parse range: '${sheet.properties.title}'!A1`) {
            firstCell = undefined;
          }
        });

        if(firstCell) {
          headers = headers.data.values[0];
          firstCell = firstCell.data.values[0];
  
          // slice firs cell from the word "where" to the end of the string
          firstCell = firstCell.slice(firstCell.indexOf('where'));
  
          let colNumber = firstCell.split(' ')[1];
          let newCol = null;
  
          // check if last header is named 'Status'
          if(headers[headers.length - 1] === 'Status') {
            newCol = `Col${headers.length}`;
          } else if (headers[headers.length - 1] === 'Row') {
            newCol = `Col${headers.length + 1}`;
            let statusColumn = excelRows[headers.length];
            // add 'Status' column in write sheet
            try {
              await workbook.spreadsheets.values.update({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${statusColumn}1:${statusColumn}1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['Status']]
                }
              });
            } catch (err) {
              console.log(err);
            }

          } else {
            newCol = `Col${headers.length + 2}`;
            // add 'Row' and 'Status' column in write sheet
            let statusColumn = excelRows[headers.length + 1];
            let rowColumn = excelRows[headers.length];

            try {
              await workbook.spreadsheets.values.batchUpdate({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${rowColumn}1:${statusColumn}1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['Row', 'Status']]
                }
              });
            } catch (err) {
              console.log(err);
            }

            // add value under 'Row' column first row
            try {
              await workbook.spreadsheets.values.update({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${rowColumn}2`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['=ArrayFormula(sequence(MATCH(2,1/(A2:A<>""),1)))']]
                }
              });
            } catch (err) {
              console.log(err);
            }
          }
  
          // if there is a new column, replace the old column with the new column and update the value of the first cell in the sheet
          if(newCol) {
            firstCell = firstCell.replace(colNumber, newCol);
  
            try {
              await workbook.spreadsheets.values.update({
                spreadsheetId: config.readSheetId,
                range: `'${sheet.properties.title}'!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [[firstCell]]
                }
              });
  
              console.log(`Sheet: ${sheet.properties.title} has been updated`);
            } catch (err) {
              console.log(err);
            }
          }
        } else if (firstCell === undefined) {
          // create sheet in read file
          try {
            await workbook.spreadsheets.batchUpdate({
              spreadsheetId: config.readSheetId,
              resource: {
                requests: [
                  {
                    addSheet: {
                      properties: {
                        title: sheet.properties.title
                      }
                    }
                  }
                ]
              }
            });
  
            console.log(`Sheet: ${sheet.properties.title} has been created`);
          } catch (err) {
            console.log(err);
          }

          // add firstcell to new sheet
          let column = null;

          if(headers[headers.length - 1] === 'Status') {
            newCol = `Col${headers.length}`;
          } else if (headers[headers.length - 1] === 'Row') {
            newCol = `Col${headers.length + 1}`;
            let statusColumn = excelRows[headers.length];
            // add 'Status' column in write sheet
            try {
              await workbook.spreadsheets.values.update({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${statusColumn}1:${statusColumn}1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['Status']]
                }
              });
            } catch (err) {
              console.log(err);
            }

          } else {
            newCol = `Col${headers.length + 2}`;
            // add 'Row' and 'Status' column in write sheet
            let statusColumn = excelRows[headers.length + 1];
            let rowColumn = excelRows[headers.length];

            try {
              await workbook.spreadsheets.values.batchUpdate({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${rowColumn}1:${statusColumn}1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['Row', 'Status']]
                }
              });
            } catch (err) {
              console.log(err);
            }

            // add value under 'Row' column first row
            try {
              await workbook.spreadsheets.values.update({
                spreadsheetId: config.writeSheetId,
                range: `'${sheet.properties.title}'!${rowColumn}2`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                  values: [['=ArrayFormula(sequence(MATCH(2,1/(A2:A<>""),1)))']]
                }
              });
            } catch (err) {
              console.log(err);
            }
          }

          let firstCellNew = `=arrayformula(query(to_text(IMPORTRANGE("https://docs.google.com/spreadsheets/d/${config.writeSheetId}", "'${sheets.properties.title}'!A1:ZZ")), "select * where ${column} != 'Done'",1))`;
          
          try {
            await workbook.spreadsheets.values.update({
              spreadsheetId: config.readSheetId,
              range: `'${sheet.properties.title}'!A1`,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: [[firstCellNew]]
              }
            });

            console.log(`Sheet: ${sheet.properties.title} has been updated`);
          } catch (err) {
            console.log(err);
          }
        }
      });
    })
    .catch(console.error);


}).catch(console.error);