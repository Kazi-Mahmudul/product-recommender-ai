/**
 * Admin dashboard overview page
 */

import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiDatabase, 
  FiActivity, 
  FiTrendingUp,
  FiCheck,
  FiX,
  FiClock,
  FiRefreshCw
} from 'react-icons/fi';
import { adminApi } from '../../services/adminApi';
import { DashboardStats } from '../../types/admin';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Failed to load dashboard data</div>
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      title: 'Total Phones',
      value: stats.total_phones.toLocaleString(),
      icon: <FiDatabase className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      icon: <FiUsers className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Active Sessions',
      value: stats.active_sessions.toLocaleString(),
      icon: <FiActivity className="w-6 h-6" />,
      color: 'purple'
    },
    {
      title: 'API Status',
      value: stats.api_health.status === 'healthy' ? 'Healthy' : 'Issues',
      icon: stats.api_health.status === 'healthy' ? 
        <FiCheck className="w-6 h-6" /> : 
        <FiX className="w-6 h-6" />,
      color: stats.api_health.status === 'healthy' ? 'green' : 'red'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="w-4 h-4 text-green-500" />;
      case 'running':
        return <FiRefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <FiX className="w-4 h-4 text-red-500" />;
      default:
        return <FiClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCardColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 border-blue-200',
      green: 'bg-green-500 border-green-200', 
      purple: 'bg-purple-500 border-purple-200',
      red: 'bg-red-500 border-red-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to the Peyechi admin panel
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={loadDashboardStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-opacity-20">
            <div className={`inline-flex p-3 rounded-lg ${getCardColorClasses(card.color)} bg-opacity-10 mb-4`}>
              <div className={`text-${card.color}-600`}>
                {card.icon}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.trend && (
                <div className={`flex items-center mt-2 text-sm ${
                  card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <FiTrendingUp className="w-4 h-4 mr-1" />
                  <span>{card.trend.value}% vs last month</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Compared Phones */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Compared Phones</h3>
          <div className="space-y-3">
            {stats.most_compared_phones.slice(0, 5).map((phone, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900">{phone.name}</p>
                  <p className="text-sm text-gray-500">{phone.brand}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-600">{phone.comparison_count}</p>
                  <p className="text-xs text-gray-500">comparisons</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Searches */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Searches</h3>
          <div className="space-y-3">
            {stats.trending_searches.slice(0, 5).map((search, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-gray-900">{search.query}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{search.count}</p>
                  <p className="text-xs text-gray-500">searches</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Health */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-semibold ${
                stats.api_health.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.api_health.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Response Time</span>
              <span className="font-semibold text-gray-900">{stats.api_health.response_time}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Success Rate</span>
              <span className="font-semibold text-gray-900">{stats.api_health.success_rate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Check</span>
              <span className="text-sm text-gray-500">
                {new Date(stats.api_health.last_check).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Scraper Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scraper Runs</h3>
          <div className="space-y-3">
            {stats.scraper_status.slice(0, 5).map((scraper, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(scraper.status)}
                  <div>
                    <p className="font-medium text-gray-900">{scraper.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{scraper.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{scraper.records_processed}</p>
                  <p className="text-xs text-gray-500">records</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};