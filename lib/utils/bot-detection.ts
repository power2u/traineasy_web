/**
 * Bot Detection and Blocking Utilities
 * Prevents automated access and crawlers from accessing sensitive areas
 */

/**
 * Known bot user agents (exact matches for better accuracy)
 */
const BOT_USER_AGENTS = [
  // Search engine bots
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot',
  // Social media crawlers
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegram',
  // Development tools
  'postman', 'insomnia', 'httpie',
  // Automation tools
  'headless', 'phantom', 'selenium', 'puppeteer', 'playwright',
  // Scraping tools
  'scrapy', 'beautifulsoup', 'mechanize',
  // HTTP clients
  'apache-httpclient', 'okhttp', 'jersey'
];

/**
 * Programming language indicators in user agents
 */
const PROGRAMMING_INDICATORS = [
  'python-requests', 'python-urllib', 'java/', 'php/', 'ruby/', 'go-http-client',
  'node-fetch', 'axios/', 'curl/', 'wget/', 'libwww-perl'
];

/**
 * Legitimate browser user agent patterns
 */
const BROWSER_PATTERNS = [
  'mozilla/', 'chrome/', 'safari/', 'firefox/', 'edge/', 'opera/',
  'webkit/', 'gecko/', 'trident/'
];

/**
 * Whitelisted user agents (for legitimate tools that might be flagged)
 */
const WHITELISTED_USER_AGENTS: string[] = [
  // Add specific user agents that should never be blocked
  // Example: 'mylegitimateapp/1.0'
];

/**
 * Check if user agent is whitelisted
 */
function isWhitelistedUserAgent(userAgent: string): boolean {
  const lowerUA = userAgent.toLowerCase();
  return WHITELISTED_USER_AGENTS.some(whitelisted => 
    lowerUA.includes(whitelisted.toLowerCase())
  );
}

/**
 * Suspicious IP patterns (known malicious ranges)
 */
const SUSPICIOUS_IP_PATTERNS: never[] = [
  // Add known malicious IP ranges here if needed
  // Note: Be very careful with IP blocking as it can affect legitimate users
];

/**
 * Rate limiting storage for bot attempts
 */
class BotAttemptTracker {
  private attempts = new Map<string, { count: number; firstAttempt: number }>();
  private lastCleanup = Date.now();

  track(identifier: string): boolean {
    this.cleanup();
    
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxAttempts = 10; // Increased from 5 to be less aggressive
    
    const existing = this.attempts.get(identifier);
    
    if (!existing || now - existing.firstAttempt > windowMs) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now });
      return true;
    }
    
    existing.count++;
    
    if (existing.count > maxAttempts) {
      return false; // Block
    }
    
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const cleanupInterval = 10 * 60 * 1000; // 10 minutes
    
    // Only cleanup if enough time has passed
    if (now - this.lastCleanup < cleanupInterval) {
      return;
    }
    
    const windowMs = 60 * 60 * 1000; // 1 hour
    
    for (const [key, value] of this.attempts.entries()) {
      if (now - value.firstAttempt > windowMs) {
        this.attempts.delete(key);
      }
    }
    
    this.lastCleanup = now;
  }
}

const botTracker = new BotAttemptTracker();

/**
 * Check if request is from a bot or crawler (more accurate detection)
 */
export function isBotRequest(request: Request): boolean {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // Check whitelist first
  if (isWhitelistedUserAgent(userAgent)) {
    return false;
  }
  
  // Check for empty or very short user agent (common in bots)
  if (!userAgent || userAgent.length < 5) {
    return true;
  }
  
  // Check if it's a legitimate browser first
  const hasBrowserPattern = BROWSER_PATTERNS.some(pattern => 
    userAgent.includes(pattern.toLowerCase())
  );
  
  // If it looks like a browser, be more lenient
  if (hasBrowserPattern) {
    // Only flag as bot if it has obvious bot indicators
    return BOT_USER_AGENTS.some(botAgent => 
      userAgent.includes(botAgent.toLowerCase())
    );
  }
  
  // Check against known bot user agents
  for (const botAgent of BOT_USER_AGENTS) {
    if (userAgent.includes(botAgent.toLowerCase())) {
      return true;
    }
  }
  
  // Check for programming language indicators
  for (const indicator of PROGRAMMING_INDICATORS) {
    if (userAgent.includes(indicator.toLowerCase())) {
      return true;
    }
  }
  
  // Check for suspicious patterns (but be more specific)
  if (userAgent.includes('http://') || userAgent.includes('https://')) {
    return true;
  }
  
  // Check for obvious automation keywords
  if (userAgent.match(/\b(bot|crawler|spider|scraper|automation|headless)\b/i)) {
    return true;
  }
  
  return false;
}

/**
 * Check if IP address is suspicious (less aggressive)
 */
export function isSuspiciousIP(ip: string): boolean {
  if (!ip || ip === 'unknown') {
    return false; // Don't block unknown IPs, just log them
  }
  
  // Check against known malicious patterns only
  for (const pattern of SUSPICIOUS_IP_PATTERNS) {
    if (ip.startsWith(pattern)) {
      return true;
    }
  }
  
  // Don't block private IPs in production as they're common behind load balancers
  // Only block localhost in production if it's a direct connection
  if (process.env.NODE_ENV === 'production' && ip === '127.0.0.1') {
    return true;
  }
  
  return false;
}

/**
 * Check for automated request patterns (less strict)
 */
export function hasAutomatedPatterns(request: Request): boolean {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // If it looks like a browser, be more lenient with headers
  const hasBrowserPattern = BROWSER_PATTERNS.some(pattern => 
    userAgent.includes(pattern.toLowerCase())
  );
  
  if (hasBrowserPattern) {
    // For browser-like user agents, only check for obvious automation
    return false;
  }
  
  // Check for missing common headers (only for non-browser requests)
  const acceptHeader = request.headers.get('accept');
  const userAgentHeader = request.headers.get('user-agent');
  
  // Missing both accept and user-agent is suspicious
  if (!acceptHeader && !userAgentHeader) {
    return true;
  }
  
  // Check for suspicious header combinations only for POST requests
  if (request.method === 'POST') {
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const contentType = request.headers.get('content-type');
    
    // POST without any origin info and with JSON content type (API call)
    if (!referer && !origin && contentType?.includes('application/json')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get client fingerprint for tracking
 */
export function getClientFingerprint(request: Request): string {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Create a simple fingerprint
  const fingerprint = `${userAgent}-${acceptLanguage}-${acceptEncoding}`;
  return Buffer.from(fingerprint).toString('base64').slice(0, 16);
}

/**
 * Comprehensive bot detection with improved accuracy
 */
export function detectBot(request: Request, clientIP?: string): {
  isBot: boolean;
  reason: string;
  confidence: number; // 0-100
} {
  let confidence = 0;
  const reasons: string[] = [];
  
  // Check if bot detection is enabled
  if (process.env.BOT_DETECTION_ENABLED === 'false') {
    return {
      isBot: false,
      reason: 'Bot detection disabled',
      confidence: 0
    };
  }
  
  // Check user agent (primary indicator)
  if (isBotRequest(request)) {
    confidence += 60; // Increased weight for user agent
    reasons.push('Bot user agent detected');
  }
  
  // Check IP (lower weight since many legitimate users are behind proxies)
  if (clientIP && isSuspiciousIP(clientIP)) {
    confidence += 20; // Reduced from 30
    reasons.push('Suspicious IP address');
  }
  
  // Check automated patterns (moderate weight)
  if (hasAutomatedPatterns(request)) {
    confidence += 30; // Reduced from 40
    reasons.push('Automated request patterns');
  }
  
  // Additional checks for better accuracy
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  // Check for obvious automation tools
  if (userAgent.includes('automation') || userAgent.includes('test')) {
    confidence += 25;
    reasons.push('Automation tool detected');
  }
  
  // Check for missing critical headers
  if (!request.headers.get('accept') && !request.headers.get('user-agent')) {
    confidence += 35;
    reasons.push('Missing critical headers');
  }
  
  // Reduce confidence if it looks like a legitimate browser
  const hasBrowserPattern = BROWSER_PATTERNS.some(pattern => 
    userAgent.includes(pattern.toLowerCase())
  );
  
  if (hasBrowserPattern && confidence < 80) {
    confidence = Math.max(0, confidence - 20);
    reasons.push('Browser-like user agent detected');
  }
  
  // Get threshold from environment or use default
  const threshold = parseInt(process.env.BOT_DETECTION_THRESHOLD || '70');
  
  return {
    isBot: confidence >= threshold,
    reason: reasons.join(', '),
    confidence
  };
}

/**
 * Create bot blocking response
 */
export function createBotBlockResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Access denied',
      message: 'Automated requests are not allowed',
      code: 'BOT_DETECTED'
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  );
}

/**
 * Track bot attempts using the class-based tracker
 */
export function trackBotAttempt(identifier: string): boolean {
  return botTracker.track(identifier);
}

/**
 * Debug function to analyze a request without blocking
 * Useful for testing and fine-tuning detection rules
 */
export function analyzeRequest(request: Request, clientIP?: string): {
  userAgent: string;
  ip: string;
  headers: Record<string, string>;
  botDetection: ReturnType<typeof detectBot>;
  recommendations: string[];
  detectionBreakdown: {
    userAgentScore: number;
    ipScore: number;
    patternScore: number;
    automationScore: number;
    headerScore: number;
    browserReduction: number;
  };
} {
  const userAgent = request.headers.get('user-agent') || '';
  const headers: Record<string, string> = {};
  
  // Collect relevant headers
  const relevantHeaders = [
    'accept', 'accept-language', 'accept-encoding', 'referer', 'origin',
    'content-type', 'x-requested-with', 'sec-fetch-site', 'sec-fetch-mode'
  ];
  
  relevantHeaders.forEach(header => {
    const value = request.headers.get(header);
    if (value) headers[header] = value;
  });
  
  const botDetection = detectBot(request, clientIP);
  const recommendations: string[] = [];
  
  // Calculate detailed breakdown
  const detectionBreakdown = {
    userAgentScore: isBotRequest(request) ? 60 : 0,
    ipScore: (clientIP && isSuspiciousIP(clientIP)) ? 20 : 0,
    patternScore: hasAutomatedPatterns(request) ? 30 : 0,
    automationScore: (userAgent.includes('automation') || userAgent.includes('test')) ? 25 : 0,
    headerScore: (!request.headers.get('accept') && !request.headers.get('user-agent')) ? 35 : 0,
    browserReduction: BROWSER_PATTERNS.some(pattern => 
      userAgent.toLowerCase().includes(pattern.toLowerCase())
    ) ? -20 : 0
  };
  
  // Provide recommendations based on analysis
  if (botDetection.isBot) {
    if (botDetection.confidence > 85) {
      recommendations.push('High confidence bot - consider blocking');
    } else if (botDetection.confidence > 70) {
      recommendations.push('Medium confidence bot - monitor closely');
    } else {
      recommendations.push('Low confidence bot - likely false positive');
    }
  } else {
    recommendations.push('Appears to be legitimate user');
  }
  
  if (isWhitelistedUserAgent(userAgent)) {
    recommendations.push('User agent is whitelisted');
  }
  
  // Add specific recommendations
  if (detectionBreakdown.userAgentScore > 0) {
    recommendations.push('Consider adding to whitelist if legitimate');
  }
  
  if (detectionBreakdown.browserReduction < 0) {
    recommendations.push('Browser-like user agent reduces bot confidence');
  }
  
  return {
    userAgent,
    ip: clientIP || 'unknown',
    headers,
    botDetection,
    recommendations,
    detectionBreakdown
  };
}

/**
 * Get statistics about bot detection
 */
export function getBotDetectionStats(): {
  totalAttempts: number;
  activeTracking: number;
  configuration: {
    enabled: boolean;
    threshold: number;
    logOnly: boolean;
  };
} {
  return {
    totalAttempts: botTracker['attempts']?.size || 0,
    activeTracking: botTracker['attempts']?.size || 0,
    configuration: {
      enabled: process.env.BOT_DETECTION_ENABLED !== 'false',
      threshold: parseInt(process.env.BOT_DETECTION_THRESHOLD || '70'),
      logOnly: process.env.BOT_DETECTION_LOG_ONLY === 'true'
    }
  };
}

/**
 * Add a user agent to the whitelist (for admin use)
 */
export function addToWhitelist(userAgent: string): void {
  if (!WHITELISTED_USER_AGENTS.includes(userAgent)) {
    WHITELISTED_USER_AGENTS.push(userAgent);
    console.log(`[Bot Detection] Added to whitelist: ${userAgent}`);
  }
}

/**
 * Remove a user agent from the whitelist
 */
export function removeFromWhitelist(userAgent: string): void {
  const index = WHITELISTED_USER_AGENTS.indexOf(userAgent);
  if (index > -1) {
    WHITELISTED_USER_AGENTS.splice(index, 1);
    console.log(`[Bot Detection] Removed from whitelist: ${userAgent}`);
  }
}

/**
 * Get current whitelist
 */
export function getWhitelist(): string[] {
  return [...WHITELISTED_USER_AGENTS];
}