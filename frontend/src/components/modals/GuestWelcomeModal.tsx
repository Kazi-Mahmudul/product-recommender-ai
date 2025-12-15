import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Zap, X } from 'lucide-react';

interface GuestWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GuestWelcomeModal: React.FC<GuestWelcomeModalProps> = ({ isOpen, onClose }) => {
    // Determine if we should show the modal (client-side only check to avoid hydration mismatch if SSR)
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldShow(true);
        } else {
            const timer = setTimeout(() => setShouldShow(false), 300); // Allow exit animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldShow && !isOpen) return null;

    // Use "as any" cast to avoid TS build errors with AnimatePresence similar to RateLimitModal
    const AnimatePresenceAny = AnimatePresence as any;

    return (
        <AnimatePresenceAny>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-[#1a1b26] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/20 dark:border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative Header Background */}
                        <div className="relative h-32 bg-gradient-to-br from-[#059669] to-[#10b981] overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

                            <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-full mb-3 shadow-lg">
                                    <MessageSquare className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">Welcome to Peyechi AI</h2>
                            </div>

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            <div className="text-center space-y-2">
                                <p className="text-gray-600 dark:text-gray-300">
                                    Get instant, AI-powered phone recommendations and comparisons.
                                </p>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/50">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-lg shrink-0">
                                        <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                            Guest Access Logic
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            As a guest, you have <span className="font-bold text-emerald-600 dark:text-emerald-400">10 free queries</span> to try out our AI capabilities.
                                            Once used, you can sign up for more!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Start Chatting
                            </button>

                            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                                No credit card required. Free to verify.
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresenceAny>
    );
};

export default GuestWelcomeModal;
