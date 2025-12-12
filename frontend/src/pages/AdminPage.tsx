import React, { useState, useEffect } from 'react';
import { Users, Smartphone, BarChart3, TrendingUp, GitCompare, Activity, Eye, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <span className="text-3xl font-bold text-gray-800 dark:text-white">{value}</span>
      )}
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 font-medium">{title}</h3>
  </div>
);

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    phones: 0,
    activeUsers: 0,
    comparisons: 0,
    totalTraffic: 0,
    weeklyTraffic: 0,
    monthlyTraffic: 0,
    currentActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_BASE = process.env.REACT_APP_API_BASE || '';

      // Fetch users count
      const usersRes = await fetch(`${API_BASE}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();

      // Fetch phones count from admin endpoint
      const phonesRes = await fetch(`${API_BASE}/api/v1/admin/phones?limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const phonesData = await phonesRes.json();

      // Fetch comparison stats
      const comparisonsRes = await fetch(`${API_BASE}/api/v1/admin/comparisons/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const comparisonsData = await comparisonsRes.json();

      // Fetch traffic analytics
      const trafficRes = await fetch(`${API_BASE}/api/v1/admin/analytics/traffic`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const trafficData = await trafficRes.json();

      setStats({
        users: Array.isArray(usersData) ? usersData.length : 0,
        activeUsers: Array.isArray(usersData) ? usersData.filter((u: any) => u.is_verified).length : 0,
        phones: phonesData.total || 0,
        comparisons: comparisonsData.total_comparisons || 0,
        totalTraffic: trafficData.total_traffic || 0,
        weeklyTraffic: trafficData.weekly_traffic || 0,
        monthlyTraffic: trafficData.monthly_traffic || 0,
        currentActive: trafficData.current_active || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back, {user?.first_name || 'Admin'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.users}
          icon={Users}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={TrendingUp}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          title="Total Phones"
          value={stats.phones}
          icon={Smartphone}
          color="bg-purple-500"
          loading={loading}
        />
        <StatCard
          title="Total Comparisons"
          value={stats.comparisons}
          icon={GitCompare}
          color="bg-orange-500"
          loading={loading}
        />
      </div>

      {/* Traffic Analytics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Traffic Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Current Active"
            value={stats.currentActive}
            icon={Activity}
            color="bg-red-500"
            loading={loading}
          />
          <StatCard
            title="Total Traffic"
            value={stats.totalTraffic}
            icon={Eye}
            color="bg-indigo-500"
            loading={loading}
          />
          <StatCard
            title="Weekly Traffic"
            value={stats.weeklyTraffic}
            icon={TrendingUp}
            color="bg-teal-500"
            loading={loading}
          />
          <StatCard
            title="Monthly Traffic"
            value={stats.monthlyTraffic}
            icon={Calendar}
            color="bg-pink-500"
            loading={loading}
          />
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">System Status</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Backend API is operational</span>
          </div>
          <div className="flex items-center gap-3 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Database connection stable</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;