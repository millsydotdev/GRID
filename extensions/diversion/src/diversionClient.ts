/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as https from 'node:https';

const API_BASE_URL = 'https://api.diversion.dev/v0';

export class DiversionClient {
	constructor(private token: string) { }

	async request<T>(path: string, method: string = 'GET', body?: any): Promise<T> {
		const url = `${API_BASE_URL}${path}`;

		return new Promise((resolve, reject) => {
			const req = https.request(url, {
				method,
				headers: {
					'Authorization': `Bearer ${this.token}`,
					'Content-Type': 'application/json'
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						try {
							const json = JSON.parse(data);
							resolve(json);
						} catch {
							// eslint-disable-next-line local/code-no-dangerous-type-assertions
							resolve({} as T);
						}
					} else {
						reject(new Error(`API Error: ${res.statusCode} ${data}`));
					}
				});
			});

			req.on('error', (e) => reject(e));
			if (body) {
				req.write(JSON.stringify(body));
			}
			req.end();
		});
	}

	/**
	 * List repositories
	 */
	async listRepos() {
		return this.request<{ items: any[] }>('/repos');
	}
}
