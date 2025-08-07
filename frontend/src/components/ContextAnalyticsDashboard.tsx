import React, { useState, useEffect } from 'react';
import { ContextAnalytics } from '../services/contextAnalytics';

interface AnalyticsDashboardProps {
  darkMode?: boolean;
  onClose?: () => void;
}

const ContextAnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  darkMode = false,
  onClose
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [effectiveness, setEffectiveness] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, [refreshKey]);

  const loadAnalytics = () => {
    try {
      setMetrics(ContextAnalytics.getUsageMetrics());
      setEffectiveness(ContextAnalytics.getEffectivenessReport());
      setPerformance(ContextAnalytics.getPerformanceMetrics());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExport = () => {
    try {
      const data = ContextAnalytics.exportAnalyticsData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `context-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all analytics data?')) {
      ContextAnalytics.clearAnalyticsData();
      handleRefresh();
    }
  };

  if (!metrics || !effectiveness || !performance) {
    return (
      <div className={`p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex justify-between items-center">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Context Analytics Dashboard
            </h1>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className={`px-4 py-2 rounded ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
              >
                Refresh
              </button>
              <button
                onClick={handleExport}
                className={`px-4 py-2 rounded ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white`}
              >
                Export
              </button>
              <button
                onClick={handleClear}
                className={`px-4 py-2 rounded ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
              >
                Clear
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'} text-white`}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Context Usage Rate"
            value={`${effectiveness.contextUsageRate.toFixed(1)}%`}
            darkMode={darkMode}
            description="Percentage of suggestions using context"
          />
          <MetricCard
            title="Contextual Click Rate"
            value={`${metrics.contextualSuggestionClickRate.toFixed(1)}%`}
            darkMode={darkMode}
            description="Click rate for contextual suggestions"
          />
          <MetricCard
            title="Regular Click Rate"
            value={`${metrics.regularSuggestionClickRate.toFixed(1)}%`}
            darkMode={darkMode}
            description="Click rate for regular suggestions"
          />
          <MetricCard
            title="Avg Context Lifetime"
            value={`${(effectiveness.averageContextLifetime / 1000 / 60).toFixed(1)}m`}
            darkMode={darkMode}
            description="Average time context remains active"
          />
        </div>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Usage Statistics
            </h2>
            <div className="space-y-2">
              <StatRow label="Contexts Created" value={metrics.totalContextsCreated} darkMode={darkMode} />
              <StatRow label="Contexts Retrieved" value={metrics.totalContextsRetrieved} darkMode={darkMode} />
              <StatRow label="Contexts Expired" value={metrics.totalContextsExpired} darkMode={darkMode} />
              <StatRow label="Suggestions Generated" value={metrics.totalSuggestionsGenerated} darkMode={darkMode} />
              <StatRow label="Suggestions Clicked" value={metrics.totalSuggestionsClicked} darkMode={darkMode} />
              <StatRow label="Fallback Rate" value={`${effectiveness.fallbackRate.toFixed(1)}%`} darkMode={darkMode} />
            </div>
          </div>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Performance Metrics
            </h2>
            <div className="space-y-2">
              <StatRow 
                label="Avg Context Creation" 
                value={`${performance.averageContextCreationTime.toFixed(1)}ms`} 
                darkMode={darkMode} 
              />
              <StatRow 
                label="Avg Context Retrieval" 
                value={`${performance.averageContextRetrievalTime.toFixed(1)}ms`} 
                darkMode={darkMode} 
              />
              <StatRow 
                label="Avg Suggestion Generation" 
                value={`${performance.averageSuggestionGenerationTime.toFixed(1)}ms`} 
                darkMode={darkMode} 
              />
              <StatRow 
                label="Context Creation Samples" 
                value={performance.contextCreationLatency.length} 
                darkMode={darkMode} 
              />
              <StatRow 
                label="Context Retrieval Samples" 
                value={performance.contextRetrievalLatency.length} 
                darkMode={darkMode} 
              />
              <StatRow 
                label="Suggestion Generation Samples" 
                value={performance.suggestionGenerationLatency.length} 
                darkMode={darkMode} 
              />
            </div>
          </div>
        </div>

        {/* Top Performing Context Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Top Performing Context Types
            </h2>
            <div className="space-y-2">
              {effectiveness.topPerformingContextTypes.slice(0, 5).map((type: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {type.type}
                  </span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {type.clickRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Most Referenced Phones
            </h2>
            <div className="space-y-2">
              {metrics.mostReferencedPhones.slice(0, 5).map((phone: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>
                    {phone.phone}
                  </span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {phone.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Analytics Summary
          </h2>
          <pre className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>
            {ContextAnalytics.getAnalyticsSummary()}
          </pre>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  darkMode: boolean;
  description?: string;
}> = ({ title, value, darkMode, description }) => (
  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
      {title}
    </h3>
    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {value}
    </p>
    {description && (
      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
        {description}
      </p>
    )}
  </div>
);

const StatRow: React.FC<{
  label: string;
  value: string | number;
  darkMode: boolean;
}> = ({ label, value, darkMode }) => (
  <div className="flex justify-between items-center">
    <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
      {label}
    </span>
    <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {value}
    </span>
  </div>
);

export default ContextAnalyticsDashboard;