const TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEnvelope<T> {
	storedAt: number;
	value: T;
}

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function readSessionStorage<T>(key: string): CacheEnvelope<T> | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const raw = sessionStorage.getItem(key);
		return raw ? (JSON.parse(raw) as CacheEnvelope<T>) : null;
	} catch {
		return null;
	}
}

function writeSessionStorage<T>(key: string, envelope: CacheEnvelope<T>): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(key, JSON.stringify(envelope));
	} catch {
		// sessionStorage full or unavailable (private browsing) — memory cache still works.
	}
}

/**
 * Session-scoped cache (in-memory + sessionStorage) so a single browsing
 * session doesn't repeatedly refetch the ~250-row member/seat roster or the
 * parliamentary group colors. This is purely a client-side courtesy cache —
 * there is no build-time snapshot; every fresh session still fetches live.
 */
export async function withSessionCache<T>(key: string, load: () => Promise<T>): Promise<T> {
	const now = Date.now();

	const inMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;
	if (inMemory && now - inMemory.storedAt < TTL_MS) return inMemory.value;

	const stored = readSessionStorage<T>(key);
	if (stored && now - stored.storedAt < TTL_MS) {
		memoryCache.set(key, stored);
		return stored.value;
	}

	const value = await load();
	const envelope: CacheEnvelope<T> = { storedAt: now, value };
	memoryCache.set(key, envelope);
	writeSessionStorage(key, envelope);
	return value;
}

/** Test-only: clears the in-memory cache so mocked responses aren't masked between test cases. */
export function clearSessionCacheForTests(): void {
	memoryCache.clear();
}
