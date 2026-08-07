// =============================================================================
// Market Data Service — Unified API for Stocks, Crypto, and Forex
// =============================================================================

export type MarketType = 'stock' | 'crypto' | 'forex';

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface OHLCVBar {
    time: number;      // Unix timestamp (seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Quote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    volume: number;
    marketCap?: number;
    marketType: MarketType;
    currency: string;
    exchange?: string;
    lastUpdated: number;
}

export interface MarketSearchResult {
    symbol: string;
    name: string;
    type: MarketType;
    exchange?: string;
}

// =============================================================================
// In-Memory Cache with TTL
// =============================================================================

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class TTLCache {
    private cache = new Map<string, CacheEntry<any>>();

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlMs: number): void {
        this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    clear(): void {
        this.cache.clear();
    }
}

const cache = new TTLCache();

// TTL durations
const QUOTE_TTL = 30_000;        // 30 seconds
const HISTORY_TTL = 5 * 60_000;  // 5 minutes
const SEARCH_TTL = 60 * 60_000;  // 1 hour
const TRENDING_TTL = 10 * 60_000; // 10 minutes

// =============================================================================
// Rate Limiter (Token Bucket)
// =============================================================================

class RateLimiter {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private maxTokens: number,
        private refillRate: number // tokens per second
    ) {
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }

    async acquire(): Promise<void> {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;

        if (this.tokens < 1) {
            const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
            await new Promise(resolve => setTimeout(resolve, waitMs));
            this.tokens = 0;
        } else {
            this.tokens -= 1;
        }
    }
}

const rateLimiters = {
    yahoo: new RateLimiter(5, 2),        // 5 burst, 2/sec sustained
    coingecko: new RateLimiter(10, 5),   // 10 burst, 5/sec sustained  
    exchangerate: new RateLimiter(5, 1), // 5 burst, 1/sec sustained
};

// =============================================================================
// Yahoo Finance (Stocks) — via public query endpoints
// =============================================================================

const YAHOO_BASE = 'https://query1.finance.yahoo.com';

function mapYahooInterval(interval: TimeInterval): string {
    const map: Record<TimeInterval, string> = {
        '1m': '1m', '5m': '5m', '15m': '15m',
        '1h': '60m', '4h': '60m', '1d': '1d', '1w': '1wk', '1M': '1mo'
    };
    return map[interval];
}

function mapYahooRange(interval: TimeInterval): string {
    const map: Record<TimeInterval, string> = {
        '1m': '1d', '5m': '5d', '15m': '5d',
        '1h': '1mo', '4h': '6mo', '1d': '1y', '1w': '5y', '1M': '10y'
    };
    return map[interval];
}

async function fetchYahooQuote(symbol: string): Promise<Quote> {
    const cacheKey = `quote:stock:${symbol}`;
    const cached = cache.get<Quote>(cacheKey);
    if (cached) return cached;

    await rateLimiters.yahoo.acquire();

    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(`No data for symbol: ${symbol}`);

    const meta = result.meta;
    const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
    const price = meta.regularMarketPrice || 0;
    const change = price - prevClose;

    const quote: Quote = {
        symbol: meta.symbol,
        name: meta.shortName || meta.symbol,
        price,
        change,
        changePercent: prevClose ? (change / prevClose) * 100 : 0,
        high: meta.regularMarketDayHigh || meta.dayHigh || 0,
        low: meta.regularMarketDayLow || meta.dayLow || 0,
        open: meta.regularMarketOpen || 0,
        previousClose: prevClose,
        volume: meta.regularMarketVolume || 0,
        marketCap: undefined,
        marketType: 'stock',
        currency: meta.currency || 'USD',
        exchange: meta.exchangeName,
        lastUpdated: Date.now(),
    };

    cache.set(cacheKey, quote, QUOTE_TTL);
    return quote;
}

async function fetchYahooHistory(symbol: string, interval: TimeInterval): Promise<OHLCVBar[]> {
    const cacheKey = `history:stock:${symbol}:${interval}`;
    const cached = cache.get<OHLCVBar[]>(cacheKey);
    if (cached) return cached;

    await rateLimiters.yahoo.acquire();

    const yahooInterval = mapYahooInterval(interval);
    const range = mapYahooRange(interval);
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${yahooInterval}&range=${range}`;

    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) throw new Error(`Yahoo Finance history error: ${res.status}`);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(`No history for: ${symbol}`);

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const bars: OHLCVBar[] = timestamps.map((t: number, i: number) => ({
        time: t,
        open: quotes.open?.[i] ?? 0,
        high: quotes.high?.[i] ?? 0,
        low: quotes.low?.[i] ?? 0,
        close: quotes.close?.[i] ?? 0,
        volume: quotes.volume?.[i] ?? 0,
    })).filter((bar: OHLCVBar) => bar.open && bar.close);

    cache.set(cacheKey, bars, HISTORY_TTL);
    return bars;
}

async function searchYahoo(query: string): Promise<MarketSearchResult[]> {
    const cacheKey = `search:stock:${query}`;
    const cached = cache.get<MarketSearchResult[]>(cacheKey);
    if (cached) return cached;

    await rateLimiters.yahoo.acquire();

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results: MarketSearchResult[] = (data.quotes || [])
        .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX')
        .map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            type: 'stock' as MarketType,
            exchange: q.exchange,
        }));

    cache.set(cacheKey, results, SEARCH_TTL);
    return results;
}

// =============================================================================
// CoinGecko (Crypto) — Free API, no key needed
// =============================================================================

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Map common crypto symbols to CoinGecko IDs
const CRYPTO_ID_MAP: Record<string, string> = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
    'BNB': 'binancecoin', 'XRP': 'ripple', 'ADA': 'cardano',
    'DOGE': 'dogecoin', 'DOT': 'polkadot', 'AVAX': 'avalanche-2',
    'MATIC': 'matic-network', 'LINK': 'chainlink', 'UNI': 'uniswap',
    'SHIB': 'shiba-inu', 'LTC': 'litecoin', 'ATOM': 'cosmos',
    'FIL': 'filecoin', 'NEAR': 'near', 'APT': 'aptos',
    'ARB': 'arbitrum', 'OP': 'optimism', 'SUI': 'sui',
    'PEPE': 'pepe', 'WIF': 'dogwifcoin', 'RENDER': 'render-token',
    'FET': 'fetch-ai', 'INJ': 'injective-protocol',
};

function getCoinGeckoId(symbol: string): string {
    const upper = symbol.toUpperCase().replace('/USD', '').replace('USDT', '').replace('-USD', '');
    return CRYPTO_ID_MAP[upper] || upper.toLowerCase();
}

function mapCoinGeckoDays(interval: TimeInterval): number {
    const map: Record<TimeInterval, number> = {
        '1m': 1, '5m': 1, '15m': 1,
        '1h': 7, '4h': 30, '1d': 365, '1w': 365 * 3, '1M': 365 * 5
    };
    return map[interval];
}

async function fetchCryptoQuote(symbol: string): Promise<Quote> {
    const coinId = getCoinGeckoId(symbol);
    const cacheKey = `quote:crypto:${coinId}`;
    const cached = cache.get<Quote>(cacheKey);
    if (cached) return cached;

    await rateLimiters.coingecko.acquire();

    const url = `${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);

    const data = await res.json();
    const coin = data[coinId];
    if (!coin) throw new Error(`No crypto data for: ${symbol}`);

    const price = coin.usd || 0;
    const changePercent = coin.usd_24h_change || 0;

    const quote: Quote = {
        symbol: symbol.toUpperCase(),
        name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
        price,
        change: price * (changePercent / 100),
        changePercent,
        high: 0,
        low: 0,
        open: 0,
        previousClose: price / (1 + changePercent / 100),
        volume: coin.usd_24h_vol || 0,
        marketCap: coin.usd_market_cap,
        marketType: 'crypto',
        currency: 'USD',
        exchange: 'Crypto',
        lastUpdated: (coin.last_updated_at || Math.floor(Date.now() / 1000)) * 1000,
    };

    cache.set(cacheKey, quote, QUOTE_TTL);
    return quote;
}

async function fetchCryptoHistory(symbol: string, interval: TimeInterval): Promise<OHLCVBar[]> {
    const coinId = getCoinGeckoId(symbol);
    const cacheKey = `history:crypto:${coinId}:${interval}`;
    const cached = cache.get<OHLCVBar[]>(cacheKey);
    if (cached) return cached;

    await rateLimiters.coingecko.acquire();

    const days = mapCoinGeckoDays(interval);

    // For OHLC data
    const url = `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`CoinGecko history error: ${res.status}`);

    const data: number[][] = await res.json();

    const bars: OHLCVBar[] = data.map(([timestamp, open, high, low, close]) => ({
        time: Math.floor(timestamp / 1000),
        open, high, low, close,
        volume: 0, // OHLC endpoint doesn't include volume
    }));

    cache.set(cacheKey, bars, HISTORY_TTL);
    return bars;
}

async function searchCrypto(query: string): Promise<MarketSearchResult[]> {
    const cacheKey = `search:crypto:${query}`;
    const cached = cache.get<MarketSearchResult[]>(cacheKey);
    if (cached) return cached;

    await rateLimiters.coingecko.acquire();

    const url = `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);

    if (!res.ok) return [];

    const data = await res.json();
    const results: MarketSearchResult[] = (data.coins || []).slice(0, 10).map((c: any) => ({
        symbol: c.symbol?.toUpperCase() || c.id,
        name: c.name || c.id,
        type: 'crypto' as MarketType,
        exchange: 'Crypto',
    }));

    cache.set(cacheKey, results, SEARCH_TTL);
    return results;
}

async function fetchTrendingCrypto(): Promise<MarketSearchResult[]> {
    const cacheKey = 'trending:crypto';
    const cached = cache.get<MarketSearchResult[]>(cacheKey);
    if (cached) return cached;

    await rateLimiters.coingecko.acquire();

    const url = `${COINGECKO_BASE}/search/trending`;
    const res = await fetch(url);

    if (!res.ok) return [];

    const data = await res.json();
    const results: MarketSearchResult[] = (data.coins || []).slice(0, 10).map((c: any) => ({
        symbol: c.item?.symbol?.toUpperCase() || '',
        name: c.item?.name || '',
        type: 'crypto' as MarketType,
        exchange: 'Crypto',
    }));

    cache.set(cacheKey, results, TRENDING_TTL);
    return results;
}

// =============================================================================
// Forex — via exchangerate.host free API
// =============================================================================

const FOREX_PAIRS = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
    'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
];

async function fetchForexQuote(pair: string): Promise<Quote> {
    const cacheKey = `quote:forex:${pair}`;
    const cached = cache.get<Quote>(cacheKey);
    if (cached) return cached;

    const yahooSymbol = pair.replace('/', '') + '=X';
    const quote = await fetchYahooQuote(yahooSymbol);

    const forexQuote: Quote = {
        ...quote,
        symbol: pair,
        name: pair,
        marketType: 'forex',
    };

    cache.set(cacheKey, forexQuote, QUOTE_TTL);
    return forexQuote;
}

async function fetchForexHistory(pair: string, interval: TimeInterval): Promise<OHLCVBar[]> {
    const cacheKey = `history:forex:${pair}:${interval}`;
    const cached = cache.get<OHLCVBar[]>(cacheKey);
    if (cached) return cached;

    const yahooSymbol = pair.replace('/', '') + '=X';
    const bars = await fetchYahooHistory(yahooSymbol, interval);

    cache.set(cacheKey, bars, HISTORY_TTL);
    return bars;
}

function searchForex(query: string): MarketSearchResult[] {
    const q = query.toUpperCase().replace('/', '').replace('-', '');
    return FOREX_PAIRS
        .filter(p => p.replace('/', '').includes(q))
        .map(p => ({
            symbol: p,
            name: p,
            type: 'forex' as MarketType,
            exchange: 'Forex',
        }));
}

// =============================================================================
// Unified Public API
// =============================================================================

export async function getQuote(symbol: string, type: MarketType): Promise<Quote> {
    switch (type) {
        case 'stock': return fetchYahooQuote(symbol);
        case 'crypto': return fetchCryptoQuote(symbol);
        case 'forex': return fetchForexQuote(symbol);
    }
}

export async function getHistory(symbol: string, type: MarketType, interval: TimeInterval): Promise<OHLCVBar[]> {
    switch (type) {
        case 'stock': return fetchYahooHistory(symbol, interval);
        case 'crypto': return fetchCryptoHistory(symbol, interval);
        case 'forex': return fetchForexHistory(symbol, interval);
    }
}

export async function searchMarket(query: string, type?: MarketType): Promise<MarketSearchResult[]> {
    if (type === 'forex') return searchForex(query);
    if (type === 'stock') return searchYahoo(query);
    if (type === 'crypto') return searchCrypto(query);

    // Search all markets
    const [stocks, crypto, forex] = await Promise.allSettled([
        searchYahoo(query),
        searchCrypto(query),
        Promise.resolve(searchForex(query)),
    ]);

    return [
        ...(stocks.status === 'fulfilled' ? stocks.value : []),
        ...(crypto.status === 'fulfilled' ? crypto.value : []),
        ...(forex.status === 'fulfilled' ? forex.value : []),
    ];
}

export async function getTrending(type: MarketType): Promise<MarketSearchResult[]> {
    if (type === 'crypto') return fetchTrendingCrypto();
    
    // Default trending for stocks
    if (type === 'stock') {
        return [
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'META', name: 'Meta Platforms', type: 'stock', exchange: 'NASDAQ' },
            { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'stock', exchange: 'NYSE' },
        ];
    }

    // Forex
    return FOREX_PAIRS.map(p => ({ symbol: p, name: p, type: 'forex' as MarketType, exchange: 'Forex' }));
}
