/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';

/**
 * Cache entry with metadata
 */
export interface ICacheEntry<V> {
	/**
	 * Cache key
	 */
	key: string;

	/**
	 * Cached value
	 */
	value: V;

	/**
	 * Timestamp when entry was added
	 */
	timestamp: number;

	/**
	 * Last access timestamp
	 */
	lastAccess: number;

	/**
	 * Access count
	 */
	accessCount: number;
}

/**
 * LRU Cache options
 */
export interface ILRUCacheOptions<V> {
	/**
	 * Maximum number of entries
	 */
	maxSize: number;

	/**
	 * Optional value calculator for cache misses
	 */
	calculateValue?: (key: string) => Promise<V | null>;

	/**
	 * Optional TTL (time to live) in milliseconds
	 */
	ttl?: number;
}

/**
 * LRU (Least Recently Used) Cache
 *
 * Maintains a fixed-size cache that evicts least recently used items when full.
 * Supports async value calculation and TTL expiration.
 */
export class LRUCache<V> extends Disposable {
	private readonly entries = new Map<string, ICacheEntry<V>>();
	private readonly maxSize: number;
	private readonly calculateValue?: (key: string) => Promise<V | null>;
	private readonly ttl?: number;

	private readonly _onEvict = this._register(new Emitter<ICacheEntry<V>>());
	readonly onEvict: Event<ICacheEntry<V>> = this._onEvict.event;

	private readonly _onHit = this._register(new Emitter<string>());
	readonly onHit: Event<string> = this._onHit.event;

	private readonly _onMiss = this._register(new Emitter<string>());
	readonly onMiss: Event<string> = this._onMiss.event;

	constructor(options: ILRUCacheOptions<V>) {
		super();
		this.maxSize = options.maxSize;
		this.calculateValue = options.calculateValue;
		this.ttl = options.ttl;
	}

	/**
	 * Get a value from the cache
	 *
	 * @param key Cache key
	 * @returns Cached value or undefined
	 */
	get(key: string): V | undefined {
		const entry = this.entries.get(key);

		if (!entry) {
			this._onMiss.fire(key);
			return undefined;
		}

		// Check TTL expiration
		if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
			this.delete(key);
			this._onMiss.fire(key);
			return undefined;
		}

		// Update access metadata
		entry.lastAccess = Date.now();
		entry.accessCount++;

		// Move to end (most recently used)
		this.entries.delete(key);
		this.entries.set(key, entry);

		this._onHit.fire(key);
		return entry.value;
	}

	/**
	 * Get a value from cache or calculate it
	 *
	 * @param key Cache key
	 * @returns Cached or calculated value
	 */
	async getOrCalculate(key: string): Promise<V | undefined> {
		const cached = this.get(key);
		if (cached !== undefined) {
			return cached;
		}

		if (!this.calculateValue) {
			return undefined;
		}

		const value = await this.calculateValue(key);
		if (value !== null) {
			this.set(key, value);
			return value;
		}

		return undefined;
	}

	/**
	 * Set a value in the cache
	 *
	 * @param key Cache key
	 * @param value Value to cache
	 */
	set(key: string, value: V): void {
		// Check if key already exists
		const existing = this.entries.get(key);
		if (existing) {
			// Update existing entry
			existing.value = value;
			existing.timestamp = Date.now();
			existing.lastAccess = Date.now();
			existing.accessCount++;

			// Move to end
			this.entries.delete(key);
			this.entries.set(key, existing);
			return;
		}

		// Create new entry
		const entry: ICacheEntry<V> = {
			key,
			value,
			timestamp: Date.now(),
			lastAccess: Date.now(),
			accessCount: 1,
		};

		// Add to cache
		this.entries.set(key, entry);

		// Evict oldest if over max size
		if (this.entries.size > this.maxSize) {
			this.evictOldest();
		}
	}

	/**
	 * Check if key exists in cache
	 *
	 * @param key Cache key
	 * @returns True if key exists
	 */
	has(key: string): boolean {
		const entry = this.entries.get(key);
		if (!entry) {
			return false;
		}

		// Check TTL expiration
		if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
			this.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Delete a key from cache
	 *
	 * @param key Cache key
	 * @returns True if key was deleted
	 */
	delete(key: string): boolean {
		const entry = this.entries.get(key);
		if (entry) {
			this.entries.delete(key);
			this._onEvict.fire(entry);
			return true;
		}
		return false;
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.entries.clear();
	}

	/**
	 * Get cache size
	 */
	get size(): number {
		return this.entries.size;
	}

	/**
	 * Get all keys
	 */
	keys(): string[] {
		return Array.from(this.entries.keys());
	}

	/**
	 * Get all values
	 */
	values(): V[] {
		return Array.from(this.entries.values()).map(e => e.value);
	}

	/**
	 * Get all entries
	 */
	getEntries(): ICacheEntry<V>[] {
		return Array.from(this.entries.values());
	}

	/**
	 * Evict the least recently used entry
	 */
	private evictOldest(): void {
		// First entry is oldest (least recently used)
		const oldest = this.entries.keys().next().value;
		if (oldest) {
			const entry = this.entries.get(oldest)!;
			this.entries.delete(oldest);
			this._onEvict.fire(entry);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStatistics(): {
		size: number;
		maxSize: number;
		oldestEntry?: {
			key: string;
			age: number;
		};
		mostAccessed?: {
			key: string;
			count: number;
		};
	} {
		const entries = this.getEntries();

		let oldestEntry: { key: string; age: number } | undefined;
		let mostAccessed: { key: string; count: number } | undefined;

		for (const entry of entries) {
			const age = Date.now() - entry.timestamp;

			if (!oldestEntry || age > oldestEntry.age) {
				oldestEntry = { key: entry.key, age };
			}

			if (!mostAccessed || entry.accessCount > mostAccessed.count) {
				mostAccessed = { key: entry.key, count: entry.accessCount };
			}
		}

		return {
			size: this.size,
			maxSize: this.maxSize,
			oldestEntry,
			mostAccessed,
		};
	}

	/**
	 * Clean up expired entries
	 */
	cleanup(): void {
		if (!this.ttl) {
			return;
		}

		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.entries.entries()) {
			if (now - entry.timestamp > this.ttl) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.delete(key);
		}
	}

	/**
	 * Dispose and clear cache
	 */
	override dispose(): void {
		this.clear();
		super.dispose();
	}
}

/**
 * Precalculated LRU Cache
 *
 * Specialized LRU cache that precalculates values on cache misses.
 * Maintains N most recent items and automatically initializes new keys.
 */
export class PrecalculatedLRUCache<V> extends Disposable {
	private readonly cache: LRUCache<V>;

	constructor(
		private readonly calculateValue: (key: string) => Promise<V | null>,
		maxSize: number
	) {
		super();
		this.cache = this._register(new LRUCache<V>({
			maxSize,
			calculateValue,
		}));
	}

	/**
	 * Initialize a key in the cache
	 *
	 * If key exists, moves it to end (most recently used)
	 * If key doesn't exist, calculates value and adds it
	 */
	async initKey(key: string): Promise<void> {
		// Check if already in cache
		if (this.cache.has(key)) {
			// Move to end by accessing it
			this.cache.get(key);
			return;
		}

		// Calculate and add new entry
		const value = await this.calculateValue(key);
		if (value !== null) {
			this.cache.set(key, value);
		}
	}

	/**
	 * Get a value from cache
	 */
	get(key: string): V | undefined {
		return this.cache.get(key);
	}

	/**
	 * Get cache size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Clear cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Dispose and clear cache
	 */
	override dispose(): void {
		this.cache.dispose();
		super.dispose();
	}
}
