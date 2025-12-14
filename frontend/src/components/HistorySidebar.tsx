import React, { useEffect, useState } from 'react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { ChatSession, chatAPIService } from '../api/chat';
import { useAuth } from '../context/AuthContext';
import { InlineSpinner } from './LoadingIndicator';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSession: (sessionId: string) => void;
    currentSessionId?: string;
    onNewChat: () => void;
    darkMode: boolean;
    variant?: 'overlay' | 'sidebar';
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    onSelectSession,
    currentSessionId,
    onNewChat,
    darkMode,
    variant = 'overlay'
}) => {
    const { user, token } = useAuth();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if ((isOpen || variant === 'sidebar') && token) {
            fetchHistory();
        }
    }, [isOpen, variant, token]);

    const fetchHistory = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await chatAPIService.getChatHistory(token);
            setSessions(data?.sessions || []);
            setError(null);
        } catch (err) {
            setError('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!token || !window.confirm('Delete this chat?')) return;

        try {
            await chatAPIService.deleteChatSession(token, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSessionId === sessionId) {
                onNewChat();
            }
        } catch (err) {
            console.error('Failed to delete session', err);
        }
    };

    const groupSessions = (sessions: ChatSession[]) => {
        const groups: { [key: string]: ChatSession[] } = {};

        if (!Array.isArray(sessions)) return groups;

        sessions.forEach(session => {
            const date = new Date(session.updated_at);
            let key = 'Older';

            if (isToday(date)) key = 'Today';
            else if (isYesterday(date)) key = 'Yesterday';
            else if (date > subDays(new Date(), 7)) key = 'Previous 7 Days';

            if (!groups[key]) groups[key] = [];
            groups[key].push(session);
        });

        return groups;
    };

    const groupedSessions = groupSessions(sessions);
    const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

    if (!isOpen && variant === 'overlay') return null;

    // Base classes
    const baseClasses = `flex flex-col h-full ${darkMode ? 'bg-black border-r border-gray-800' : 'bg-gray-50 border-r border-gray-200'}`;

    // Variant specific classes
    const containerClasses = variant === 'overlay'
        ? `fixed top-0 bottom-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        : `hidden md:${isOpen ? 'flex' : 'hidden'} w-[260px] flex-shrink-0 transition-all duration-300`;

    return (
        <>
            {/* Mobile Overlay */}
            {variant === 'overlay' && isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`${containerClasses} ${baseClasses}`}>
                {/* Header */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} flex items-center justify-between`}>
                    <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>History</h2>
                    <button
                        onClick={onNewChat}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                            }`}
                        title="New Chat"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {!user ? (
                        <div className="p-4 text-center">
                            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Sign in to save and access your chat history.
                            </p>
                            {/* Login button could go here or rely on main nav */}
                        </div>
                    ) : loading ? (
                        <div className="flex justify-center p-4">
                            <InlineSpinner darkMode={darkMode} />
                        </div>
                    ) : error ? (
                        <div className={`text-center p-4 text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {error}
                            <button
                                onClick={fetchHistory}
                                className="block mx-auto mt-2 text-xs underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className={`text-center p-4 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            No history yet. Start a conversation!
                        </div>
                    ) : (
                        groupOrder.map(group => {
                            const groupSessions = groupedSessions[group];
                            if (!groupSessions || groupSessions.length === 0) return null;

                            return (
                                <div key={group}>
                                    <h3 className={`px-3 py-2 text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'
                                        }`}>
                                        {group}
                                    </h3>
                                    <div className="space-y-1">
                                        {groupSessions.map(session => (
                                            <div
                                                key={session.id}
                                                className={`
                          group relative flex items-center px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors
                          ${currentSessionId === session.id
                                                        ? (darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900')
                                                        : (darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50')
                                                    }
                        `}
                                                onClick={() => onSelectSession(session.id)}
                                            >
                                                <div className="flex-1 truncate pr-6">
                                                    {session.title || 'Using Peyechi AI'}
                                                </div>

                                                {/* Delete button (visible on hover) */}
                                                <button
                                                    onClick={(e) => handleDelete(e, session.id)}
                                                    className={`
                            absolute right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
                            ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}
                          `}
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};

export default HistorySidebar;
