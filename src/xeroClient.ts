import { Issuer, TokenSet, custom } from 'openid-client';
import * as xero from './gen/api';
import request = require('request');
import http = require('http');

export interface IXeroClientConfig {
    clientId: string,
    clientSecret: string,
    redirectUris: string[],
    scopes: string[],
}

export class XeroClient {
    readonly accountingApi: xero.AccountingApi;

    private openIdClient: any; // from openid-client
    private tokenSet: TokenSet;

    private _tenantIds: string[];
    get tenantIds(): string[] {
        return this._tenantIds;
    }

    constructor(private readonly config: IXeroClientConfig) {
        // need to set access token before use
        this.accountingApi = new xero.AccountingApi(); 
    }

    async buildConsentUrl() {
        const issuer = await Issuer.discover('https://identity.xero.com');
        this.openIdClient = new issuer.Client({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uris: this.config.redirectUris,
        });
        this.openIdClient[custom.clock_tolerance] = 5; // to allow a 5 second skew in the openid-client validations

        const url = this.openIdClient.authorizationUrl({
            redirect_uri: this.config.redirectUris[0],
            scope: this.config.scopes.join(' ') || 'openid email profile'
        });

        return url;
    }

    async setAccessTokenFromRedirectUri(url: string) {
        // get query params as object
        const urlObject = new URL(url);
        let params: { [key: string]: string } = {};
        for (const [key, value] of urlObject.searchParams) {
            params[key] = value;
        }

        this.tokenSet = await this.openIdClient.callback(this.config.redirectUris[0], params);
        this.setAccessTokenForAllApis();

        await this.fetchConnectedTenantIds();
    }

    async readIdTokenClaims() {
        return this.tokenSet.claims();
    }

    async readTokenSet() {
        return this.tokenSet;
    }

    async setTokenSet(savedTokens: TokenSet) {
        this.tokenSet = savedTokens;
        this.setAccessTokenForAllApis();
    }

    async refreshToken() {

        if (!this.tokenSet) {
            throw new Error('tokenSet is not defined');
        }
        this.tokenSet = await this.openIdClient.refresh(this.tokenSet.refresh_token);
        this.setAccessTokenForAllApis();

        await this.fetchConnectedTenantIds();
    }

    private setAccessTokenForAllApis() {
        const accessToken = this.tokenSet.access_token;
        if (typeof accessToken === 'undefined') {
            throw new Error('Access token is undefined!');
        }
        
        this.accountingApi.accessToken = accessToken;
        // this.payrollApi.accessToken = accessToken;
        // etc.
    }

    private async fetchConnectedTenantIds() {
        // retrieve the authorized tenants from api.xero.com/connections
        const result = await new Promise<{ response: http.IncomingMessage; body: Array<{ id: string, tenantId: string, tenantType: string }> }>((resolve, reject) => {
            request({
                method: 'GET',
                uri: 'https://api.xero.com/connections',
                auth: {
                    bearer: this.tokenSet.access_token
                },
                json: true
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                        resolve({ response: response, body: body });
                    } else {
                        reject({ response: response, body: body });
                    }
                }
            });
        });

        this._tenantIds = result.body.map(connection => connection.tenantId);

        // Requests to the accounting api will look like this:
        //   let apiResponse = await xeroClient.accountingApi.getInvoices(xeroClient.tenantIds[0]);
    }
}
