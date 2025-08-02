/**
 * Monitoring Dashboard
 * 
 * Provides a web-based dashboard for monitoring system health,
 * metrics, and alerts in real-time.
 */

const express = require('express');
const path = require('path');

class MonitoringDashboard {
  constructor(aiServiceManager, config = {}) {
    this.aiServiceManager = aiServiceManager;
    this.config = {
      port: config.port || 3001,
      refreshInterval: config.refreshInterval || 30000, // 30 seconds
      enableAuth: config.enableAuth || false,
      authToken: config.authToken || 'monitoring-token',
      ...config
    };
    
    this.app = express();
    this.server = null;
    this.setupRoutes();
    
    console.log(`[${new Date().toISOString()}] 📊 MonitoringDashboard initialized`);
  }

  /**
   * Setup Express routes for the dashboard
   */
  setupRoutes() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'dashboard-static')));
    
    // Authentication middleware
    if (this.config.enableAuth) {
      this.app.use('/api', (req, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token !== this.config.authToken) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
      });
    }

    // API Routes
    this.setupApiRoutes();
    
    // Dashboard HTML route
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });
  }

  /**
   * Setup API routes for dashboard data
   */
  setupApiRoutes() {
    // System status endpoint
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = this.aiServiceManager.getServiceStatus();
        res.json({
          timestamp: new Date().toISOString(),
          status: 'healthy',
          uptime: process.uptime(),
          ...status
        });
      } catch (error) {
        res.status(500).json({
          timestamp: new Date().toISOString(),
          status: 'error',
          error: error.message
        });
      }
    });

    // Detailed metrics endpoint
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const timeRange = parseInt(req.query.timeRange) || (60 * 60 * 1000); // 1 hour default
        const metrics = this.aiServiceManager.getDetailedMetrics(timeRange);
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const status = this.aiServiceManager.getServiceStatus();
        const isHealthy = status.availableProviders.length > 0 || status.fallbackMode;
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          availableProviders: status.availableProviders.length,
          fallbackMode: status.fallbackMode,
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    });

    // Alerts endpoint
    this.app.get('/api/alerts', async (req, res) => {
      try {
        const metrics = this.aiServiceManager.getDetailedMetrics();
        const alerts = metrics.current?.alerts || { active: [], total: 0 };
        
        res.json({
          timestamp: new Date().toISOString(),
          activeAlerts: alerts.active,
          totalAlerts: alerts.total,
          alertHistory: alerts.history || []
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Provider status endpoint
    this.app.get('/api/providers', async (req, res) => {
      try {
        const status = this.aiServiceManager.getServiceStatus();
        res.json({
          timestamp: new Date().toISOString(),
          providers: status.healthStatus,
          quotaStatus: status.quotaStatus,
          availableProviders: status.availableProviders,
          totalProviders: status.totalProviders
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Export metrics endpoint
    this.app.get('/api/export', async (req, res) => {
      try {
        const format = req.query.format || 'json';
        const data = this.aiServiceManager.exportMetrics(format);
        
        const filename = `metrics-${Date.now()}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        res.send(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // System actions endpoint
    this.app.post('/api/actions/:action', async (req, res) => {
      try {
        const { action } = req.params;
        
        switch (action) {
          case 'refresh-providers':
            const refreshResult = await this.aiServiceManager.refreshProviderStatus();
            res.json({ success: true, result: refreshResult });
            break;
            
          case 'set-log-level':
            const { level } = req.body;
            this.aiServiceManager.setLogLevel(level);
            res.json({ success: true, message: `Log level set to ${level}` });
            break;
            
          default:
            res.status(400).json({ error: `Unknown action: ${action}` });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Generate HTML for the monitoring dashboard
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Quota Management - Monitoring Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .header .subtitle {
            opacity: 0.8;
            font-size: 0.9rem;
            margin-top: 0.25rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border: 1px solid #e1e8ed;
        }
        
        .card h3 {
            color: #2c3e50;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-healthy { background: #27ae60; }
        .status-warning { background: #f39c12; }
        .status-error { background: #e74c3c; }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
            color: #555;
        }
        
        .metric-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .alert {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }
        
        .alert.error {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
        
        .alert.success {
            background: #d4edda;
            border-color: #c3e6cb;
        }
        
        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }
        
        .btn:hover {
            background: #2980b9;
        }
        
        .btn.danger {
            background: #e74c3c;
        }
        
        .btn.danger:hover {
            background: #c0392b;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
        
        .timestamp {
            font-size: 0.8rem;
            color: #666;
            text-align: right;
            margin-top: 1rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 AI Quota Management System</h1>
        <div class="subtitle">Real-time Monitoring Dashboard</div>
    </div>
    
    <div class="container">
        <div class="grid">
            <div class="card">
                <h3>📊 System Status</h3>
                <div id="system-status" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🔌 Provider Health</h3>
                <div id="provider-status" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h3>📈 Performance Metrics</h3>
                <div id="performance-metrics" class="loading">Loading...</div>
            </div>
            
            <div class="card">
                <h3>🚨 Active Alerts</h3>
                <div id="active-alerts" class="loading">Loading...</div>
            </div>
        </div>
        
        <div class="card">
            <h3>🛠️ System Actions</h3>
            <div>
                <button class="btn" onclick="refreshProviders()">🔄 Refresh Providers</button>
                <button class="btn" onclick="exportMetrics()">📊 Export Metrics</button>
                <button class="btn danger" onclick="setLogLevel('debug')">🐛 Debug Mode</button>
                <button class="btn" onclick="setLogLevel('info')">ℹ️ Normal Mode</button>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">Last updated: Loading...</div>
    </div>
    
    <script>
        let refreshInterval;
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboardData();
            startAutoRefresh();
        });
        
        // Load all dashboard data
        async function loadDashboardData() {
            try {
                await Promise.all([
                    loadSystemStatus(),
                    loadProviderStatus(),
                    loadPerformanceMetrics(),
                    loadActiveAlerts()
                ]);
                
                document.getElementById('last-updated').textContent = 
                    'Last updated: ' + new Date().toLocaleString();
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        // Load system status
        async function loadSystemStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                const statusHtml = \`
                    <div class="metric">
                        <span class="metric-label">
                            <span class="status-indicator status-\${data.status === 'healthy' ? 'healthy' : 'error'}"></span>
                            System Health
                        </span>
                        <span class="metric-value">\${data.status || 'Unknown'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value">\${formatUptime(data.uptime || 0)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Available Providers</span>
                        <span class="metric-value">\${data.availableProviders || 0}/\${data.totalProviders || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Fallback Mode</span>
                        <span class="metric-value">\${data.fallbackMode ? 'Active' : 'Inactive'}</span>
                    </div>
                \`;
                
                document.getElementById('system-status').innerHTML = statusHtml;
            } catch (error) {
                document.getElementById('system-status').innerHTML = 
                    '<div class="alert error">Error loading system status</div>';
            }
        }
        
        // Load provider status
        async function loadProviderStatus() {
            try {
                const response = await fetch('/api/providers');
                const data = await response.json();
                
                let providersHtml = '';
                
                if (data.providers && Object.keys(data.providers).length > 0) {
                    for (const [name, status] of Object.entries(data.providers)) {
                        const healthStatus = status.isHealthy ? 'healthy' : 'error';
                        providersHtml += \`
                            <div class="metric">
                                <span class="metric-label">
                                    <span class="status-indicator status-\${healthStatus}"></span>
                                    \${name}
                                </span>
                                <span class="metric-value">\${status.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
                            </div>
                        \`;
                    }
                } else {
                    providersHtml = '<div class="alert">No providers configured</div>';
                }
                
                document.getElementById('provider-status').innerHTML = providersHtml;
            } catch (error) {
                document.getElementById('provider-status').innerHTML = 
                    '<div class="alert error">Error loading provider status</div>';
            }
        }
        
        // Load performance metrics
        async function loadPerformanceMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                
                const metrics = data.current || {};
                const metricsHtml = \`
                    <div class="metric">
                        <span class="metric-label">Total Requests</span>
                        <span class="metric-value">\${metrics.totalRequests || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value">\${((metrics.successRate || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Response Time</span>
                        <span class="metric-value">\${(metrics.averageResponseTime || 0).toFixed(0)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Requests/Min</span>
                        <span class="metric-value">\${(metrics.requestsPerMinute || 0).toFixed(1)}</span>
                    </div>
                \`;
                
                document.getElementById('performance-metrics').innerHTML = metricsHtml;
            } catch (error) {
                document.getElementById('performance-metrics').innerHTML = 
                    '<div class="alert error">Error loading performance metrics</div>';
            }
        }
        
        // Load active alerts
        async function loadActiveAlerts() {
            try {
                const response = await fetch('/api/alerts');
                const data = await response.json();
                
                let alertsHtml = '';
                
                if (data.activeAlerts && data.activeAlerts.length > 0) {
                    data.activeAlerts.forEach(alert => {
                        alertsHtml += \`
                            <div class="alert \${alert.severity || 'warning'}">
                                <strong>\${alert.type || 'Alert'}:</strong> \${alert.message || 'No message'}
                                <br><small>\${new Date(alert.timestamp).toLocaleString()}</small>
                            </div>
                        \`;
                    });
                } else {
                    alertsHtml = '<div class="alert success">✅ No active alerts</div>';
                }
                
                document.getElementById('active-alerts').innerHTML = alertsHtml;
            } catch (error) {
                document.getElementById('active-alerts').innerHTML = 
                    '<div class="alert error">Error loading alerts</div>';
            }
        }
        
        // System actions
        async function refreshProviders() {
            try {
                const response = await fetch('/api/actions/refresh-providers', {
                    method: 'POST'
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Providers refreshed successfully');
                    loadDashboardData();
                } else {
                    alert('❌ Failed to refresh providers');
                }
            } catch (error) {
                alert('❌ Error refreshing providers: ' + error.message);
            }
        }
        
        async function exportMetrics() {
            try {
                const response = await fetch('/api/export?format=json');
                const blob = await response.blob();
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`metrics-\${Date.now()}.json\`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                alert('❌ Error exporting metrics: ' + error.message);
            }
        }
        
        async function setLogLevel(level) {
            try {
                const response = await fetch('/api/actions/set-log-level', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ level })
                });
                const result = await response.json();
                
                if (result.success) {
                    alert(\`✅ Log level set to \${level}\`);
                } else {
                    alert('❌ Failed to set log level');
                }
            } catch (error) {
                alert('❌ Error setting log level: ' + error.message);
            }
        }
        
        // Auto-refresh functionality
        function startAutoRefresh() {
            refreshInterval = setInterval(loadDashboardData, ${this.config.refreshInterval});
        }
        
        function stopAutoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        }
        
        // Utility functions
        function formatUptime(seconds) {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            
            if (days > 0) {
                return \`\${days}d \${hours}h \${minutes}m\`;
            } else if (hours > 0) {
                return \`\${hours}h \${minutes}m\`;
            } else {
                return \`\${minutes}m\`;
            }
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopAutoRefresh();
            } else {
                startAutoRefresh();
                loadDashboardData();
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * Start the monitoring dashboard server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (error) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] ❌ Failed to start monitoring dashboard:`, error.message);
          reject(error);
        } else {
          console.log(`[${new Date().toISOString()}] 🚀 Monitoring dashboard started on port ${this.config.port}`);
          console.log(`[${new Date().toISOString()}] 📊 Dashboard URL: http://localhost:${this.config.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop the monitoring dashboard server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`[${new Date().toISOString()}] 🛑 Monitoring dashboard stopped`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get dashboard configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(`[${new Date().toISOString()}] ⚙️ Dashboard configuration updated`);
  }
}

module.exports = MonitoringDashboard;