'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Input, TextArea, TextField, Label } from '@heroui/react';
import { SelectField } from '@/components/ui/select-field';

// Disable static generation for this page since it's an admin page
export const dynamic = 'force-dynamic';

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
    { key: '', label: 'Choose a user agent to test...', value: '' },
    { key: 'chrome', label: 'Chrome Windows', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
    { key: 'safari', label: 'Safari Mac', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
    { key: 'iphone', label: 'iPhone', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' },
    { key: 'curl', label: 'curl', value: 'curl/7.68.0' },
    { key: 'python', label: 'Python Requests', value: 'python-requests/2.25.1' },
    { key: 'googlebot', label: 'Googlebot', value: 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
    { key: 'postman', label: 'Postman', value: 'PostmanRuntime/7.28.0' },
    { key: 'bingbot', label: 'Bingbot', value: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' }
  ];

  const methodOptions = [
    { key: 'GET', label: 'GET', value: 'GET' },
    { key: 'POST', label: 'POST', value: 'POST' },
    { key: 'PUT', label: 'PUT', value: 'PUT' }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bot Detection Management</h1>
        <p className="text-default-500">Test and manage bot detection rules</p>
      </div>

      {/* Configuration Status */}
      {stats && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Configuration Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-default-500">Status</div>
              <div className={`font-semibold ${stats.configuration.enabled ? 'text-success' : 'text-danger'}`}>
                {stats.configuration.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="text-sm text-default-500">Threshold</div>
              <div className="font-semibold">{stats.configuration.threshold}%</div>
            </div>
            <div>
              <div className="text-sm text-default-500">Mode</div>
              <div className={`font-semibold ${stats.configuration.logOnly ? 'text-warning' : 'text-primary'}`}>
                {stats.configuration.logOnly ? 'Log Only' : 'Active Blocking'}
              </div>
            </div>
            <div>
              <div className="text-sm text-default-500">Active Tracking</div>
              <div className="font-semibold">{stats.activeTracking}</div>
            </div>
          </div>
        </Card>
      )}

      {/* User Agent Testing */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Test User Agent</h2>
        <div className="space-y-4">
          <SelectField
            label="Select Common User Agent"
            options={commonUserAgents}
            value=""
            onChange={(val) => {
              if (val) setTestUserAgentValue(val);
            }}
            placeholder="Choose a user agent to test..."
          />

          <TextField>
            <Label>Or Enter Custom User Agent</Label>
            <TextArea
              placeholder="Enter user agent string to test..."
              value={testUserAgentValue}
              onChange={(e) => setTestUserAgentValue(e.target.value)}
              rows={3}
            />
          </TextField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              title="Test IP (optional)"
              placeholder="192.168.1.1"
              value={testIP}
              onChange={(e) => setTestIP(e.target.value)}
            />

            <SelectField
              label="HTTP Method"
              options={methodOptions}
              value={testMethod}
              onChange={(val) => setTestMethod(val)}
            />
          </div>

          <Button
            variant="primary"
            onPress={runUserAgentTest}
            isDisabled={loading}
          >
            {loading ? 'Testing...' : 'Test User Agent'}
          </Button>
        </div>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Analysis Results</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-default-500">Detection Result</div>
                <div className={`font-semibold text-lg ${analysis.botDetection.isBot ? 'text-danger' : 'text-success'}`}>
                  {analysis.botDetection.isBot ? 'BOT DETECTED' : 'LEGITIMATE USER'}
                </div>
              </div>
              <div>
                <div className="text-sm text-default-500">Confidence</div>
                <div className="font-semibold text-lg">{analysis.botDetection.confidence}%</div>
              </div>
              <div>
                <div className="text-sm text-default-500">IP Address</div>
                <div className="font-semibold">{analysis.ip}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-default-500 mb-2">Detection Reason</div>
              <div className="text-sm bg-default-100 p-2 rounded">{analysis.botDetection.reason}</div>
            </div>

            {analysis.detectionBreakdown && (
              <div>
                <div className="text-sm text-default-500 mb-2">Score Breakdown</div>
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
              <div className="text-sm text-default-500 mb-2">Recommendations</div>
              <ul className="text-sm space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Whitelist Management */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Whitelist Management</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={newWhitelistItem}
              onChange={(e) => setNewWhitelistItem(e.target.value)}
              placeholder="Enter user agent to whitelist..."
            />
            <Button
              variant="primary"
              isDisabled={!newWhitelistItem.trim()}
              onPress={addToWhitelist}
            >
              Add to Whitelist
            </Button>
          </div>

          <div>
            <div className="text-sm text-default-500 mb-2">Current Whitelist ({whitelist.length} items)</div>
            {whitelist.length === 0 ? (
              <div className="text-sm text-default-400 italic">No items in whitelist</div>
            ) : (
              <div className="space-y-2">
                {whitelist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-default-100 p-2 rounded">
                    <div className="text-sm font-mono truncate mr-2">{item}</div>
                    <Button
                      variant="danger"
                      size="sm"
                      onPress={() => removeFromWhitelist(item)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}