import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Shield, ShieldOff, CheckCircle, XCircle, Trash2, Eye, X } from 'lucide-react';
import Avatar from '../../components/ui/Avatar';

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${API_BASE}/api/v1/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (userId: number, field: 'is_verified' | 'is_admin', currentValue: boolean) => {
        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: !currentValue })
            });

            if (response.ok) {
                setUsers(users.map(u =>
                    u.id === userId ? { ...u, [field]: !currentValue } : u
                ));
            } else {
                const err = await response.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteUser = async (userId: number) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
                setActiveDropdown(null);
            } else {
                const err = await response.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('An error occurred while deleting the user');
        }
    };

    if (loading) {
        return <div className="animate-pulse">Loading users...</div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
                <p className="text-gray-500 text-sm">Manage user access and permissions</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px]">
                <div className="overflow-visible">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Joined</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar user={user} size="sm" />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {user.first_name} {user.last_name}
                                                </p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(user.id, 'is_verified', user.is_verified)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer hover:opacity-80 ${user.is_verified
                                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'
                                                }`}
                                            title="Click to toggle status"
                                        >
                                            {user.is_verified ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {user.is_verified ? 'Active' : 'Revoked'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => toggleStatus(user.id, 'is_admin', user.is_admin)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer hover:opacity-80 ${user.is_admin
                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400'
                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                                }`}
                                            title="Click to toggle role"
                                        >
                                            {user.is_admin ? <Shield size={12} /> : <ShieldOff size={12} />}
                                            {user.is_admin ? 'Admin' : 'User'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === user.id ? null : user.id);
                                                }}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {activeDropdown === user.id && (
                                                <div
                                                    ref={dropdownRef}
                                                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in zoom-in-95 duration-100"
                                                >
                                                    <div className="py-1" role="menu">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                                                        >
                                                            <Eye size={16} />
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => deleteUser(user.id)}
                                                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                                        >
                                                            <Trash2 size={16} />
                                                            Delete User
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No users found.</div>
                    )}
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X size={20} />
                        </button>

                        <div className="bg-gradient-to-br from-brand/10 to-brand-darkGreen/10 p-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-700">
                            <Avatar user={selectedUser} size="lg" className="w-24 h-24 text-3xl mb-4 shadow-lg" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {selectedUser.first_name} {selectedUser.last_name}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">{selectedUser.email}</p>

                            <div className="flex gap-2 mt-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${selectedUser.is_verified
                                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300'}`}>
                                    {selectedUser.is_verified ? 'Verified Account' : 'Unverified'}
                                </span>
                                {selectedUser.is_admin && (
                                    <span className="px-3 py-1 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                                        Administrator
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User ID</p>
                                    <p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">#{selectedUser.id}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Joined Date</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        {new Date(selectedUser.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Activity Overview</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Account status</span>
                                        <span className="text-gray-900 dark:text-white font-medium">Active</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Last Login</span>
                                        <span className="text-gray-900 dark:text-white font-medium">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 text-sm">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
