import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RateLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    isGuest: boolean;
    limit: number;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({
    isOpen,
    onClose,
    isGuest,
    limit
}) => {
    const navigate = useNavigate();

    // Cast to any to avoid type errors with React 18
    const AnimatePresenceAny = AnimatePresence as any;

    return (
        <AnimatePresenceAny>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-md overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-slate-900 dark:border-slate-800"
                    >
                        {/* Header with gradient background */}
                        <div className={`p-6 text-center ${isGuest ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md">
                                    {isGuest ? (
                                        <Zap className="w-8 h-8 text-white" />
                                    ) : (
                                        <Crown className="w-8 h-8 text-white" />
                                    )}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {isGuest ? 'Free Limit Reached' : 'Premium Feature'}
                            </h2>
                            <p className="mt-2 text-blue-100/90 text-sm">
                                {isGuest
                                    ? `You've used all ${limit} free guest chats.`
                                    : `You've hit the monthly limit of ${limit} chats.`
                                }
                            </p>

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-center text-gray-600 dark:text-gray-300">
                                {isGuest
                                    ? "Sign up now to unlock more free chats and save your conversation history!"
                                    : "Upgrade to Pro to enjoy unlimited chats, advanced comparisons, and priority support."
                                }
                            </p>

                            <div className="space-y-3 pt-2">
                                {isGuest ? (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate('/signup');
                                        }}
                                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        Create Free Account
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            // Navigate to pricing or similar
                                            navigate('/pricing');
                                        }}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        Upgrade to Pro
                                    </button>
                                )}

                                <button
                                    onClick={onClose}
                                    className="w-full py-3 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-xl font-medium transition-colors"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )
            }
        </AnimatePresenceAny >
    );
};

export default RateLimitModal;
