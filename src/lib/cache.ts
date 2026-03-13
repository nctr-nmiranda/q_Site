/**
 * High-performance horizontal caching utility for Quiz data.
 */
class SimpleCache {
    private cache: Map<string, { value: any; expiry: number }> = new Map()
    private maxItems: number = 500

    get<T>(key: string): T | undefined {
        const item = this.cache.get(key)
        if (!item) return undefined
        if (Date.now() > item.expiry) {
            this.cache.delete(key)
            return undefined
        }
        return item.value as T
    }

    set<T>(key: string, value: T, ttlMs: number = 1000 * 60 * 5): void {
        if (this.cache.size >= this.maxItems) {
            // Simple evict first item
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) this.cache.delete(firstKey)
        }
        this.cache.set(key, { value, expiry: Date.now() + ttlMs })
    }

    delete(key: string): void {
        this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
    }
}

export const quizCache = new SimpleCache()
