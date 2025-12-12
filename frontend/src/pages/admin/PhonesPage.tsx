import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Phone {
    id: number;
    name: string;
    brand: string;
    model: string;
    price: string;
    img_url: string;
    slug: string;
}

const PhonesPage: React.FC = () => {
    const navigate = useNavigate();
    const [phones, setPhones] = useState<Phone[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPhones, setTotalPhones] = useState(0);
    const itemsPerPage = 100;

    useEffect(() => {
        fetchPhones();
    }, [currentPage]);

    const fetchPhones = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';
            const skip = (currentPage - 1) * itemsPerPage;

            const response = await fetch(`${API_BASE}/api/v1/admin/phones?skip=${skip}&limit=${itemsPerPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setPhones(data.items || []);
            setTotalPhones(data.total || 0);
        } catch (error) {
            console.error('Error fetching phones:', error);
        } finally {
            setLoading(false);
        }
    };

    const deletePhone = async (phoneId: number) => {
        if (!window.confirm("Are you sure you want to delete this phone? This action cannot be undone.")) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token');
            const API_BASE = process.env.REACT_APP_API_BASE || '';

            const response = await fetch(`${API_BASE}/api/v1/admin/phones/${phoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setPhones(phones.filter(p => p.id !== phoneId));
            } else {
                const err = await response.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (error) {
            console.error('Error deleting phone:', error);
            alert('An error occurred while deleting the phone');
        }
    };

    const filteredPhones = phones.filter(phone =>
        phone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="animate-pulse">Loading phones...</div>;
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Phone Management</h1>
                    <p className="text-gray-500 text-sm">Manage phone catalog and specifications</p>
                </div>
                <button
                    onClick={() => navigate('/admin/phones/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
                >
                    <Plus size={20} />
                    Add New Phone
                </button>
            </div>

            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search phones by name or brand..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Model</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredPhones.map((phone) => (
                                <tr key={phone.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={phone.img_url || 'https://via.placeholder.com/50'}
                                                alt={phone.name}
                                                className="w-12 h-12 object-cover rounded-lg"
                                            />
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {phone.name}
                                                </p>
                                                <p className="text-xs text-gray-500">ID: {phone.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {phone.brand}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {phone.model}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                        {phone.price}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/phones/edit/${phone.id}`)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit Phone"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => deletePhone(phone.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete Phone"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPhones.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            {searchTerm ? 'No phones found matching your search.' : 'No phones found.'}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!searchTerm && totalPhones > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalPhones)} of {totalPhones} phones
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} of {Math.ceil(totalPhones / itemsPerPage)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalPhones / itemsPerPage), prev + 1))}
                                disabled={currentPage >= Math.ceil(totalPhones / itemsPerPage)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhonesPage;
