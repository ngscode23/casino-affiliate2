import { describe, it, expect } from 'vitest';
import { isBotUA } from '@/lib/ua';

describe('UA bot detection', () => {
  it('detects common bots', () => {
    expect(isBotUA('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUA('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBotUA('DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)')).toBe(true);
  });
  it('treats regular browsers as non-bot', () => {
    expect(isBotUA('Mozilla/5.0 AppleWebKit/537.36 Chrome/119 Safari/537.36')).toBe(false);
  });
});

