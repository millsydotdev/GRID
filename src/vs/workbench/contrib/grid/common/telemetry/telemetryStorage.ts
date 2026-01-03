/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TelemetryEvent, TelemetryQuery } from './telemetryTypes.js';
import { URI } from '../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { joinPath } from '../../../../../base/common/resources.js';

/**
 * Storage service for telemetry data
 * Stores telemetry locally (privacy-first, never send to cloud unless user opts in)
 */
export class TelemetryStorageService {
	private readonly storageDir: URI;
	private readonly maxStorageSize: number = 500 * 1024 * 1024; // 500MB
	private readonly retentionDays: number = 30;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService
	) {
		this.storageDir = joinPath(this.environmentService.userRoamingDataHome, 'telemetry');
		this._ensureStorageDir();
	}

	private async _ensureStorageDir(): Promise<void> {
		try {
			const exists = await this.fileService.exists(this.storageDir);
			if (!exists) {
				await this.fileService.createFolder(this.storageDir);
			}
		} catch (e) {
			// Ignore
		}
	}

	/**
	 * Write events to disk (compressed with gzip)
	 * Format: telemetry-YYYY-MM-DD.jsonl.gz
	 * One JSON object per line (JSONL)
	 */
	async writeEvents(events: TelemetryEvent[]): Promise<void> {
		if (events.length === 0) { return; }

		const today = new Date().toISOString().split('T')[0];
		const filename = `telemetry-${today}.jsonl`;
		const fileUri = joinPath(this.storageDir, filename);

		// Read existing file if it exists
		let existingLines: string[] = [];
		try {
			if (await this.fileService.exists(fileUri)) {
				const contentBuffer = await this.fileService.readFile(fileUri);
				existingLines = contentBuffer.value.toString().split('\n').filter((line: string) => line.trim());
			}
		} catch (error) {
			console.warn('[TelemetryStorage] Failed to read existing file:', error);
		}

		// Append new events
		const newLines = events.map((event) => JSON.stringify(event));
		const allLines = [...existingLines, ...newLines];
		const content = allLines.join('\n') + '\n';

		// Write
		await this.fileService.writeFile(fileUri, VSBuffer.fromString(content));

		// Rotate old files if needed
		await this.rotateOldFiles();
	}

	/**
	 * Query events with filters
	 */
	async queryEvents(query: TelemetryQuery): Promise<TelemetryEvent[]> {
		const results: TelemetryEvent[] = [];
		const files = await this._getTelemetryFiles();

		for (const file of files) {
			// Check if file is in time range
			if (query.timeRange) {
				const fileDate = this._extractDateFromFilename(file);
				if (fileDate < query.timeRange.start || fileDate > query.timeRange.end) {
					continue;
				}
			}

			try {
				const events = await this._readEventsFromFile(file);

				for (const event of events) {
					// Apply filters
					if (query.eventType && event.type !== query.eventType) { continue; }

					// taskType filter (present in routing and model_performance)
					if (query.taskType) {
						if (event.type === 'routing' || event.type === 'model_performance') {
							if (event.taskType !== query.taskType) { continue; }
						} else {
							// Event does not have taskType
							continue;
						}
					}

					// provider filter
					if (query.provider) {
						let provider: string | undefined;
						if (event.type === 'routing') {
							provider = event.selectedModel.provider;
						} else if (event.type === 'model_performance') {
							provider = event.provider;
						}

						if (provider !== query.provider) { continue; }
					}

					// modelName filter
					if (query.modelName) {
						let modelName: string | undefined;
						if (event.type === 'routing') {
							modelName = event.selectedModel.modelName;
						} else if (event.type === 'model_performance') {
							modelName = event.modelName;
						}

						if (modelName !== query.modelName) { continue; }
					}

					// isLocal filter
					if (query.isLocal !== undefined) {
						let isLocal: boolean | undefined;
						if (event.type === 'routing') {
							isLocal = event.selectedModel.isLocal;
						} else if (event.type === 'model_performance') {
							isLocal = event.isLocal;
						}

						if (isLocal !== query.isLocal) { continue; }
					}

					results.push(event);

					if (query.limit && results.length >= query.limit) {
						return results;
					}
				}
			} catch (error) {
				console.warn(`[TelemetryStorage] Failed to read file ${file}:`, error);
			}
		}

		return results;
	}

	/**
	 * Read events from a single compressed file
	 */
	private async _readEventsFromFile(fileUri: URI): Promise<TelemetryEvent[]> {
		try {
			const contentBuffer = await this.fileService.readFile(fileUri);
			const lines = contentBuffer.value.toString().split('\n').filter((line: string) => line.trim());
			return lines.map((line: string) => JSON.parse(line) as TelemetryEvent);
		} catch (error) {
			console.warn(`[TelemetryStorage] Failed to read file ${fileUri}:`, error);
			return [];
		}
	}

	private async _getTelemetryFiles(): Promise<URI[]> {
		try {
			if (!(await this.fileService.exists(this.storageDir))) {
				return [];
			}
			const children = await this.fileService.resolve(this.storageDir);
			if (!children.children) { return []; }

			return children.children
				.map((child: any) => child.resource)
				.filter((resource: URI) => resource.path.endsWith('.jsonl'))
				.sort((a: URI, b: URI) => {
					const dateA = this._extractDateFromFilename(a);
					const dateB = this._extractDateFromFilename(b);
					return dateB - dateA;
				});
		} catch {
			return [];
		}
	}

	private _extractDateFromFilename(fileUri: URI): number {
		const filename = fileUri.path.split('/').pop() || '';
		const match = filename.match(/telemetry-(\d{4}-\d{2}-\d{2})/);
		if (match) {
			return new Date(match[1]).getTime();
		}
		return 0;
	}

	async rotateOldFiles(): Promise<void> {
		const cutoffDate = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
		const files = await this._getTelemetryFiles();

		for (const file of files) {
			const fileDate = this._extractDateFromFilename(file);
			if (fileDate < cutoffDate) {
				try {
					await this.fileService.del(file);
				} catch (error) {
					console.warn(`[TelemetryStorage] Failed to delete old file ${file}:`, error);
				}
			}
		}

		await this._enforceStorageLimit();
	}

	private async _enforceStorageLimit(): Promise<void> {
		const files = await this._getTelemetryFiles();
		let totalSize = 0;

		for (const file of files) {
			try {
				const stats = await this.fileService.stat(file);
				totalSize += stats.size;
			} catch (error) {
				// File might have been deleted
			}
		}

		if (totalSize > this.maxStorageSize) {
			for (const file of files.reverse()) {
				try {
					const stats = await this.fileService.stat(file);
					if (totalSize <= this.maxStorageSize) { break; }

					await this.fileService.del(file);
					totalSize -= stats.size;
				} catch (error) {
					// File might have been deleted
				}
			}
		}
	}

	/**
	 * Export telemetry for analysis
	 */
	async exportForAnalysis(format: 'csv' | 'json'): Promise<string> {
		const events = await this.queryEvents({});

		if (format === 'json') {
			return JSON.stringify(events, null, 2);
		}

		// CSV export (simplified - just routing events)
		const routingEvents = events.filter((e) => e.type === 'routing') as any[];
		if (routingEvents.length === 0) { return ''; }

		const headers = [
			'timestamp',
			'taskType',
			'provider',
			'modelName',
			'isLocal',
			'confidence',
			'totalLatency',
			'tokensPerSecond',
			'userAccepted',
			'userModified',
			'editDistance',
			'qualityScore',
		];

		const rows = routingEvents.map((event) => [
			new Date(event.timestamp).toISOString(),
			event.taskType,
			event.selectedModel.provider,
			event.selectedModel.modelName,
			event.selectedModel.isLocal,
			event.routingConfidence,
			event.totalLatency,
			event.tokensPerSecond,
			event.userAccepted ?? '',
			event.userModified ?? '',
			event.editDistance ?? '',
			event.userAccepted ? (event.editDistance ? 1 - event.editDistance / 100 : 1) : 0,
		]);

		return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<{
		totalFiles: number;
		totalSize: number;
		oldestDate: number | null;
		newestDate: number | null;
	}> {
		const files = await this._getTelemetryFiles();
		let totalSize = 0;
		let oldestDate: number | null = null;
		let newestDate: number | null = null;

		for (const file of files) {
			try {
				const stats = await this.fileService.stat(file);
				totalSize += stats.size;
				const fileDate = this._extractDateFromFilename(file);
				if (!oldestDate || fileDate < oldestDate) { oldestDate = fileDate; }
				if (!newestDate || fileDate > newestDate) { newestDate = fileDate; }
			} catch (error) {
				// File might have been deleted
			}
		}

		return {
			totalFiles: files.length,
			totalSize,
			oldestDate,
			newestDate,
		};
	}
}
