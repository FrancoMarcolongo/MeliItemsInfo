const { google } = require('googleapis');
const FileMaster = require('./FileMaster');

class GoogleSheetsConfig {
    static spreadsheetId = FileMaster.getAppData().spreadSheetId;
    static range = {
        read: 'items!A:F',
        write: 'items!A1',
        backupWrite: 'backup!A1',
        clear: 'items!A:Z',
        backupClear: 'backup!A:Z',
    }
    static credentialsPath = './utils/files/credentials.json';
    static scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    static sheets = google.sheets('v4');
    static sheetId = 411455292;
    static backUpSheetId = 152635553;
}

class GsheetsHandler {
    
    static config = GoogleSheetsConfig;

    static async getAuthClient() {
        const auth = new google.auth.GoogleAuth({
            keyFile: this.config.credentialsPath,
            scopes: this.config.scopes,
        })
        return await auth.getClient();
    }

    static async readFromGoogleSheets() {
        const authClient = await this.getAuthClient();
        const sheetsData = {
            spreadsheetId: this.config.spreadsheetId,
            range: this.config.range.read,
            auth: authClient,
        };
        
        try {
            const response = await this.config.sheets.spreadsheets.values.get(sheetsData);
            const values = response.data.values;
            if (values && values.length) {
                //console.log('Datos leídos de Google Sheets:', values);
                return values;
            } else {
                console.log('No se encontraron datos en el rango especificado.');
                return [];
            }
        } catch (error) {
            console.error('Error al leer datos de Google Sheets:', error);
            return [];
        }
    }

    static async clearSheet(range) {
        const authClient = await this.getAuthClient();
        const sheetsData = {
            spreadsheetId: this.config.spreadsheetId,
            range: range,
            auth: authClient,
        };
        
        try {
            await this.config.sheets.spreadsheets.values.clear(sheetsData);
            //console.log('Datos borrados de Google Sheets.');
        } catch (error) {
            console.error('Error al borrar datos de Google Sheets:', error);
        }
    }

    static async writeToGoogleSheets(data, range) {
        const authClient = await this.getAuthClient();
        
        const sheetsData = {
            spreadsheetId: this.config.spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: data,
            },
            auth: authClient,
        };
        
        try {
            await this.config.sheets.spreadsheets.values.append(sheetsData);
            //console.log('Datos agregados a Google Sheets.');
        } catch (error) {
            console.error('Error al agregar datos a Google Sheets:', error);
        }
    }

    static async formatSheet(sheetId){
        const authClient = await this.getAuthClient();
        
        const sheetsData = {
            spreadsheetId: this.config.spreadsheetId,
            resource: {
                requests: [
                    {
                        clearBasicFilter: {
                            sheetId: sheetId,
                        },
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetId,
                                gridProperties: {
                                    frozenRowCount: 0,
                                },
                            },
                            fields: 'gridProperties.frozenRowCount',
                        },
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.0,
                                        green: 0.0,
                                        blue: 0.0,
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 1.0,
                                            green: 1.0,
                                            blue: 1.0,
                                        },
                                        fontSize: 10,
                                        bold: true,
                                    },
                                },
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)',
                        },
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 1.0,
                                        green: 1.0,
                                        blue: 1.0,
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 0.0,
                                            green: 0.0,
                                            blue: 0.0,
                                        },
                                        fontSize: 10,
                                        bold: false,
                                    },
                                },
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)',
                        },
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                                startColumnIndex: 7,
                                endColumnIndex: 8
                            },
                            //percentage format
                            cell: {
                                userEnteredFormat: {
                                    numberFormat: {
                                        type: 'PERCENT',
                                        pattern: '0.00%',
                                    },
                                },
                            },
                            fields: 'userEnteredFormat.numberFormat',
                        },
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                                startColumnIndex: 9,
                                endColumnIndex: 10
                            },
                            //percentage format
                            cell: {
                                userEnteredFormat: {
                                    numberFormat: {
                                        type: 'PERCENT',
                                        pattern: '0.00%',
                                    },
                                },
                            },
                            fields: 'userEnteredFormat.numberFormat',
                        }
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                                startColumnIndex: 19,
                                endColumnIndex: 22
                            },
                            //percentage format
                            cell: {
                                userEnteredFormat: {
                                    numberFormat: {
                                        type: 'PERCENT',
                                        pattern: '0.00%',
                                    },
                                },
                            },
                            fields: 'userEnteredFormat.numberFormat',
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetId,
                                gridProperties: {
                                    frozenRowCount: 1,
                                },
                            },
                            fields: 'gridProperties.frozenRowCount',
                        },
                    },
                    {
                        setBasicFilter: {
                            filter: {
                                range: {
                                    sheetId: sheetId,
                                },
                            },
                        },
                    },
                    {
                        repeatCell: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: 1,
                                startColumnIndex: 4,
                                endColumnIndex: 6,
                            },
                            cell : {
                                userEnteredFormat: {
                                    backgroundColor: { //light gray 
                                        red: 0.9,
                                        green: 0.9,
                                        blue: 0.9,
                                    },
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor)',
                        }
                    }
                ],
            },
            auth: authClient,
        };
        
        try {
            await this.config.sheets.spreadsheets.batchUpdate(sheetsData);
        } catch (error) {
            console.error('Error al formatear Google Sheets:', error);
        }
    }
    static async backUpData(data){
        await GsheetsHandler.clearSheet(this.config.range.backupClear);
        await GsheetsHandler.writeToGoogleSheets(data, this.config.range.backupWrite);
        await GsheetsHandler.formatSheet(this.config.backUpSheetId);
    }
    static async saveData(data){
        await GsheetsHandler.clearSheet(this.config.range.clear);
        await GsheetsHandler.writeToGoogleSheets(data, this.config.range.write);
        await GsheetsHandler.formatSheet(this.config.sheetId);
    }
}

//GsheetsHandler.formatSheet();

module.exports = GsheetsHandler;