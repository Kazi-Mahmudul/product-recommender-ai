import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UsageIndicatorProps {
    remaining: number | null;
    limit: number | null;
    isGuest: boolean;
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ remaining, limit, isGuest }) => {
    if (remaining === null || limit === null) return null;

    const percentage = (remaining / limit) * 100;

    // Determine color based on urgency
    let colorClass = "bg-green-500";
    let textColorClass = "text-green-600 dark:text-green-400";
    let bgColorClass = "bg-green-50 dark:bg-green-900/20";

    if (percentage <= 20) {
        colorClass = "bg-red-500";
        textColorClass = "text-red-600 dark:text-red-400";
        bgColorClass = "bg-red-50 dark:bg-red-900/20";
    } else if (percentage <= 50) {
        colorClass = "bg-yellow-500";
        textColorClass = "text-yellow-600 dark:text-yellow-400";
        bgColorClass = "bg-yellow-50 dark:bg-yellow-900/20";
    }

    return (
        <div className={`mt-auto mx-4 mb-4 p-3 rounded-xl border border-gray-100 dark:border-slate-800 ${bgColorClass}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {percentage <= 20 ? (
                        <AlertCircle className={`w-4 h-4 ${textColorClass}`} />
                    ) : (
                        <Zap className={`w-4 h-4 ${textColorClass}`} />
                    )}
                    <span className={`text-xs font-semibold ${textColorClass}`}>
                        {isGuest ? 'Guest Usage' : 'Monthly Usage'}
                    </span>
                </div>
                <span className={`text-xs font-bold ${textColorClass}`}>
                    {remaining}/{limit} left
                </span>
            </div>

            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full ${colorClass} rounded-full`}
                />
            </div>

            {isGuest && percentage <= 30 && (
                <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                    Sign up for 20 more free chats!
                </div>
            )}
        </div>
    );
};

export default UsageIndicator;
