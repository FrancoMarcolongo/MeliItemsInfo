const axios = require('axios');
const FileMaster = require('./FileMaster');

class TokenHandler {
    static appData;

    static async getAccessToken() {
        return FileMaster.getAccessToken();
    }

    static async getAppData() {
        this.appData = FileMaster.getAppData();
    }

    static async validateAccessToken(token, userId){
        const url = `https://api.mercadolibre.com/users/${userId}/items/search`;
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`, 
                },
            });
            
            return response.status === 200;
        } catch (error) {
            //console.log(error);
            return false;
        }
    }

    static async refreshAccessToken() {
        try {
            const token = FileMaster.getRefreshToken();
            this.getAppData();
            const url = 'https://api.mercadolibre.com/oauth/token';
            const data = {
                grant_type: 'refresh_token',
                client_id: this.appData.appId,
                client_secret: this.appData.client,
                refresh_token: token,
            };
            const headers = {
                'accept': 'application/json',
                'content-type': 'application/x-www-form-urlencoded',
            };
            
            const response = await axios.post(url, data, headers);
            
            const accessToken = response.data.access_token;
            const refreshToken = response.data.refresh_token;
            FileMaster.saveTokens(accessToken, refreshToken);
            
            return accessToken;
        } catch (error) {
            console.error('Error al refrescar el token:', error);
            throw error;
        }
    }
}

module.exports = TokenHandler;