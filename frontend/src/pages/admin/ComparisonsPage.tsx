import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, GitCompare } from 'lucide-react';

interface ComparisonStats {
    total_comparisons: number;
    total_sessions: number;
    recent_comparisons_7d: number;
    unique_phones_compared: number;
}

interface MostComparedPhone {
    slug: string;
    name: string;
    brand: string;
    model: string;
    img_url: string;
    comparison_count: number;
}

interface ComparisonPair {
    phone1: {
        slug: string;
        name: string;
        brand: string;
        img_url: string;
    };
    phone2: {
        slug: string;
        name: string;
        brand: string;
        img_url: string;
    };
    comparison_count: number;
}

interface RecentComparison {
    id: number;
    phone_name: string;
    phone_slug: string;
    user_email: string;
    added_at: string;
    session_id: string;
}

const ComparisonsPage: React.FC = () => {
    const [stats, setStats] = useState<ComparisonStats | null>(null);
    const [mostCompared, setMostCompared] = useState<MostComparedPhone[]>([]);
    const [pairs, setPairs] = useState<ComparisonPair[]>([]);
    const [recent, setRecent] = useState<RecentComparison[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, mostComparedRes, pairsRes, recentRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/admin/comparisons/stats`, { headers }),
                fetch(`${API_BASE}/api/v1/admin/comparisons/most-compared?limit=10`, { headers }),
                fetch(`${API_BASE}/api/v1/admin/comparisons/pairs?limit=10`, { headers }),
                fetch(`${API_BASE}/api/v1/admin/comparisons/recent?limit=20`, { headers })
            ]);

            const [statsData, mostComparedData, pairsData, recentData] = await Promise.all([
                statsRes.json(),
                mostComparedRes.json(),
                pairsRes.json(),
                recentRes.json()
            ]);

            setStats(statsData);
            setMostCompared(mostComparedData);
            setPairs(pairsData);
            setRecent(recentData);
        } catch (error) {
            console.error('Error fetching comparison data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse">Loading comparison analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Comparison Analytics</h1>
                <p className="text-gray-500 text-sm">Track phone comparison trends and user behavior</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <GitCompare className="text-blue-500" size={24} />
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {stats?.total_comparisons || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Total Comparisons</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="text-green-500" size={24} />
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {stats?.total_sessions || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Comparison Sessions</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="text-purple-500" size={24} />
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {stats?.recent_comparisons_7d || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Last 7 Days</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="text-orange-500" size={24} />
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {stats?.unique_phones_compared || 0}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Unique Phones</p>
                </div>
            </div>

            {/* Most Compared Phones */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Most Compared Phones</h2>
                    <p className="text-sm text-gray-500">Top phones users are comparing</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Brand</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Comparisons</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {mostCompared.map((phone, index) => (
                                <tr key={phone.slug} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        #{index + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={phone.img_url || 'https://via.placeholder.com/40'}
                                                alt={phone.name}
                                                className="w-10 h-10 object-cover rounded-lg"
                                            />
                                            <span className="text-sm text-gray-900 dark:text-white">{phone.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {phone.brand}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                            {phone.comparison_count}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Common Comparison Pairs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Common Comparison Pairs</h2>
                    <p className="text-sm text-gray-500">Phones frequently compared together</p>
                </div>
                <div className="p-6 space-y-4">
                    {pairs.map((pair, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={pair.phone1.img_url || 'https://via.placeholder.com/40'}
                                        alt={pair.phone1.name}
                                        className="w-10 h-10 object-cover rounded-lg"
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {pair.phone1.name}
                                    </span>
                                </div>
                                <span className="text-gray-400">vs</span>
                                <div className="flex items-center gap-2">
                                    <img
                                        src={pair.phone2.img_url || 'https://via.placeholder.com/40'}
                                        alt={pair.phone2.name}
                                        className="w-10 h-10 object-cover rounded-lg"
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {pair.phone2.name}
                                    </span>
                                </div>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                {pair.comparison_count} times
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Comparisons */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h2>
                    <p className="text-sm text-gray-500">Latest comparison activities</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {recent.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                        {item.phone_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {item.user_email}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {item.added_at ? new Date(item.added_at).toLocaleString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ComparisonsPage;
