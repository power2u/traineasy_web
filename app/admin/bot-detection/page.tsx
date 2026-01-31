'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, Select } from '@heroui/react';

interface BotAnalysis {
  userAgent: string;
  ip: string;
  botDetection: {
    isBot: boolean;
    reason: string;
    confidence: number;
  };
  recommendations: string[];
  detectionBreakdown: {
    userAgentScore: number;
    ipScore: number;
    patternScore: number;
    automationScore: number;
    headerScore: number;
    browserReduction: number;
  };
}

interface BotStats {
  totalAttempts: number;
  activeTracking: number;
  configuration: {
    enabled: boolean;
    threshold: number;
    logOnly: boolean;
  };
}

export default function BotDetectionPage() {
  const [analysis, setAnalysis] = useState<BotAnalysis | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Test form state
  const [testUserAgentValue, setTestUserAgentValue] = useState('');
  const [testIP, setTestIP] = useState('');
  const [testMethod, setTestMethod] = useState('GET');
  
  // Whitelist management
  const [newWhitelistItem, setNewWhitelistItem] = useState('');

  // Common user agents for testing
  const commonUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'curl/7.68.0',
    'python-requests/2.25.1',
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'PostmanRuntime/7.28.0',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/admin/debug/bot-detection');
      const data = await response.json();
      
      if (data.analysis) setAnalysis(data.analysis);
      if (data.stats) setStats(data.stats);
      if (data.whitelist) setWhitelist(data.whitelist);
    } catch (error) {
      console.error('Failed to load bot detection data:', error);
    }
  };

  const runUserAgentTest = async () => {
    if (!testUserAgentValue.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/debug/bot-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAgent: testUserAgentValue,
          testIP: testIP || undefined,
          method: testMethod
        })
      });
      
      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Failed to test user agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWhitelist = async () => {
    if (!newWhitelistItem.trim()) return;
    
    try {
      const response = await fetch('/api/admin/debug/bot-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addWhitelist',
          whitelistUserAgent: newWhitelistItem
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setWhitelist(data.whitelist);
        setNewWhitelistItem('');
      }
    } catch (error) {
      console.error('Failed to add to whitelist:', error);
    }
  };

  const removeFromWhitelist = async (userAgent: string) => {
    try {
      const response = await fetch('/api/admin/debug/bot-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeWhitelist',
          whitelistUserAgent: userAgent
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setWhitelist(data.whitelist);
      }
    } catch (error) {
      console.error('Failed to remove from whitelist:', error);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Bot Detection Management</h1>
        <p className="text-gray-600">Test and manage bot detection rules</p>
      </div>

      {/* Configuration Status */}
      {stats && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Configuration Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`font-semibold ${stats.configuration.enabled ? 'text-green-600' : 'text-red-600'}`}>
                {stats.configuration.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Threshold</div>
              <div className="font-semibold">{stats.configuration.threshold}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Mode</div>
              <div className={`font-semibold ${stats.configuration.logOnly ? 'text-yellow-600' : 'text-blue-600'}`}>
                {stats.configuration.logOnly ? 'Log Only' : 'Active Blocking'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Tracking</div>
              <div className="font-semibold">{stats.activeTracking}</div>
            </div>
          </div>
        </div>
      )}

      {/* User Agent Testing */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Test User Agent</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Common User Agent:</label>
            <select 
              className="w-full p-2 border rounded-md"
              onChange={(e) => setTestUserAgentValue(e.target.value)}
              value=""
            >
              <option value="">Choose a user agent to test...</option>
              {commonUserAgents.map((ua, index) => (
                <option key={index} value={ua}>
                  {ua.length > 80 ? `${ua.substring(0, 80)}...` : ua}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Or Enter Custom User Agent:</label>
            <textarea
              className="w-full p-2 border rounded-md"
              value={testUserAgentValue}
              onChange={(e) => setTestUserAgentValue(e.target.value)}
              placeholder="Enter user agent string to test..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test IP (optional):</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                value={testIP}
                onChange={(e) => setTestIP(e.target.value)}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">HTTP Method:</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={testMethod} 
                onChange={(e) => setTestMethod(e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
          </div>
          
          <button 
            className={`px-4 py-2 rounded-md text-white ${
              loading || !testUserAgentValue.trim() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={runUserAgentTest}
            disabled={loading || !testUserAgentValue.trim()}
          >
            {loading ? 'Testing...' : 'Test User Agent'}
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Analysis Results</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Detection Result</div>
                <div className={`font-semibold text-lg ${analysis.botDetection.isBot ? 'text-red-600' : 'text-green-600'}`}>
                  {analysis.botDetection.isBot ? 'BOT DETECTED' : 'LEGITIMATE USER'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="font-semibold text-lg">{analysis.botDetection.confidence}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">IP Address</div>
                <div className="font-semibold">{analysis.ip}</div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-2">Detection Reason</div>
              <div className="text-sm bg-gray-100 p-2 rounded">{analysis.botDetection.reason}</div>
            </div>
            
            {analysis.detectionBreakdown && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Score Breakdown</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div>User Agent: +{analysis.detectionBreakdown.userAgentScore}</div>
                  <div>IP Address: +{analysis.detectionBreakdown.ipScore}</div>
                  <div>Patterns: +{analysis.detectionBreakdown.patternScore}</div>
                  <div>Automation: +{analysis.detectionBreakdown.automationScore}</div>
                  <div>Headers: +{analysis.detectionBreakdown.headerScore}</div>
                  <div>Browser Reduction: {analysis.detectionBreakdown.browserReduction}</div>
                </div>
              </div>
            )}
            
            <div>
              <div className="text-sm text-gray-600 mb-2">Recommendations</div>
              <ul className="text-sm space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Management */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Whitelist Management</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded-md"
              value={newWhitelistItem}
              onChange={(e) => setNewWhitelistItem(e.target.value)}
              placeholder="Enter user agent to whitelist..."
            />
            <button 
              className={`px-4 py-2 rounded-md text-white ${
                !newWhitelistItem.trim() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={addToWhitelist}
              disabled={!newWhitelistItem.trim()}
            >
              Add to Whitelist
            </button>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-2">Current Whitelist ({whitelist.length} items)</div>
            {whitelist.length === 0 ? (
              <div className="text-sm text-gray-500 italic">No items in whitelist</div>
            ) : (
              <div className="space-y-2">
                {whitelist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="text-sm font-mono">{item}</div>
                    <button 
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      onClick={() => removeFromWhitelist(item)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}