const fs = require("fs");

class FileMaster {

    static getAppData(){
        const data = fs.readFileSync('./utils/files/appData.json', 'utf8');
        return JSON.parse(data);
    }

    static saveAppData(data) {
        fs.writeFileSync('./utils/files/appData.json', JSON.stringify(data));
    }

    // data is now in a json file named appData.json
    static saveAccessToken(token) {
        const appData = this.getAppData();
        appData.accessToken = token;
        this.saveAppData(appData);
        console.log('Access Token saved!');
    }

    static getAccessToken() {
        const data = this.getAppData();
        return data.accessToken;
    }

    static saveRefreshToken(token) {
        const appData = this.getAppData();
        appData.refreshToken = token;
        this.saveAppData(appData);
        console.log('Refresh Token saved!');
    }

    static saveTokens(accessToken, refreshToken) {
        const appData = this.getAppData();
        appData.accessToken = accessToken;
        appData.refreshToken = refreshToken;
        this.saveAppData(appData);
    }

    static getRefreshToken() {
        const data = this.getAppData();
        return data.refreshToken;
    }

    static saveToCsv(items, headers = null) {

        const csvContent = headers ? `${headers}\n${items.join('\n')}` : items.join('\n');
        fs.writeFileSync('items.csv', csvContent);
        console.log('CSV saved!');
    }
    
}

module.exports = FileMaster;
