import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Settings {
    site_name: string;
    site_tagline: string;
    site_logo_url: string;
    site_icon_url: string;
    contact_email: string;
    contact_phone: string;
    support_email: string;
    facebook_url: string;
    twitter_url: string;
    instagram_url: string;
    linkedin_url: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    chat_enabled: boolean;
    comparisons_enabled: boolean;
    reviews_enabled: boolean;
    user_registration_enabled: boolean;
    maintenance_mode: boolean;
    rate_limit_anonymous: number;
    rate_limit_authenticated: number;
    max_comparison_phones: number;
    ai_model: string;
    ai_temperature: number;
    ai_max_tokens: number;
    ai_enabled: boolean;
    email_notifications_enabled: boolean;
    admin_email_alerts: boolean;
    google_analytics_id: string;
    google_adsense_id: string;
    tracking_enabled: boolean;
}

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'seo' | 'features' | 'api' | 'analytics'>('general');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const API_BASE = process.env.REACT_APP_API_BASE || '/api';
            const token = localStorage.getItem('auth_token');

            const response = await axios.get(`${API_BASE}/api/v1/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSettings(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        setMessage(null);

        try {
            const API_BASE = process.env.REACT_APP_API_BASE || '/api';
            const token = localStorage.getItem('auth_token');

            await axios.put(`${API_BASE}/api/v1/admin/settings`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setSaving(false);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Are you sure you want to reset all settings to defaults?')) return;

        setSaving(true);
        try {
            const API_BASE = process.env.REACT_APP_API_BASE || '/api';
            const token = localStorage.getItem('auth_token');

            const response = await axios.post(`${API_BASE}/api/v1/admin/settings/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSettings(response.data.settings);
            setMessage({ type: 'success', text: 'Settings reset to defaults!' });
            setSaving(false);
        } catch (error) {
            console.error('Failed to reset settings:', error);
            setMessage({ type: 'error', text: 'Failed to reset settings' });
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (!settings) {
        return <div className="text-red-600">Failed to load settings</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600 mt-2">Configure your application settings</p>
            </div>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    {[
                        { id: 'general', label: 'General', icon: '🏢' },
                        { id: 'seo', label: 'SEO', icon: '🔍' },
                        { id: 'features', label: 'Features', icon: '⚡' },
                        { id: 'api', label: 'API & AI', icon: '🤖' },
                        { id: 'analytics', label: 'Analytics', icon: '📊' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-brand text-brand'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                            <input
                                type="text"
                                value={settings.site_name}
                                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Site Tagline</label>
                            <input
                                type="text"
                                value={settings.site_tagline}
                                onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                            <input
                                type="email"
                                value={settings.contact_email || ''}
                                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                            <input
                                type="email"
                                value={settings.support_email || ''}
                                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Facebook URL</label>
                            <input
                                type="url"
                                value={settings.facebook_url || ''}
                                onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Twitter URL</label>
                            <input
                                type="url"
                                value={settings.twitter_url || ''}
                                onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SEO Settings */}
            {activeTab === 'seo' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                        <input
                            type="text"
                            value={settings.meta_title || ''}
                            onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                        <textarea
                            value={settings.meta_description || ''}
                            onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Keywords (comma separated)</label>
                        <input
                            type="text"
                            value={settings.meta_keywords || ''}
                            onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Features */}
            {activeTab === 'features' && (
                <div className="space-y-4">
                    {[
                        { key: 'chat_enabled', label: 'Enable Chat Feature', description: 'Allow users to use AI chat' },
                        { key: 'comparisons_enabled', label: 'Enable Comparisons', description: 'Allow users to compare phones' },
                        { key: 'reviews_enabled', label: 'Enable Reviews', description: 'Allow users to write reviews' },
                        { key: 'user_registration_enabled', label: 'Enable User Registration', description: 'Allow new user signups' },
                        { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Put site in maintenance mode' },
                    ].map(feature => (
                        <div key={feature.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">{feature.label}</p>
                                <p className="text-sm text-gray-600">{feature.description}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings[feature.key as keyof Settings] as boolean}
                                    onChange={(e) => setSettings({ ...settings, [feature.key]: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                            </label>
                        </div>
                    ))}
                </div>
            )}

            {/* API & AI */}
            {activeTab === 'api' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                            <input
                                type="text"
                                value={settings.ai_model}
                                onChange={(e) => setSettings({ ...settings, ai_model: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">AI Temperature (0-10)</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={settings.ai_temperature}
                                onChange={(e) => setSettings({ ...settings, ai_temperature: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                            <input
                                type="number"
                                value={settings.ai_max_tokens}
                                onChange={(e) => setSettings({ ...settings, ai_max_tokens: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit (Anonymous/hour)</label>
                            <input
                                type="number"
                                value={settings.rate_limit_anonymous}
                                onChange={(e) => setSettings({ ...settings, rate_limit_anonymous: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Google Analytics ID</label>
                            <input
                                type="text"
                                placeholder="G-XXXXXXXXXX"
                                value={settings.google_analytics_id || ''}
                                onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Google AdSense ID</label>
                            <input
                                type="text"
                                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                                value={settings.google_adsense_id || ''}
                                onChange={(e) => setSettings({ ...settings, google_adsense_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Enable Tracking</p>
                            <p className="text-sm text-gray-600">Track user behavior and analytics</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.tracking_enabled}
                                onChange={(e) => setSettings({ ...settings, tracking_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 flex justify-between border-t pt-6">
                <button
                    onClick={handleReset}
                    disabled={saving}
                    className="px-6 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                    Reset to Defaults
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-2 bg-brand text-white rounded-lg hover:bg-brand-darkGreen transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
