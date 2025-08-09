import React, { useState, useEffect, useCallback } from 'react';
import { contextualAPI } from '../api/contextual';
import { contextSync } from '../services/contextSynchronization';
import { useContextMetadata } from '../hooks/useContextualQuery';

interface ContextIndicatorProps {
  hasContext: boolean;
  contextPhones: string[];
  onClearContext?: () => void;
  sessionId?: string;
  showDetails?: boolean;
  showSyncStatus?: boolean;
  onContextUpdate?: (contextInfo: any) => void;
}

interface ContextDetails {
  sessionAge: number;
  totalQueries: number;
  contextStrength: number;
  userPreferences: any;
  lastActivity: string;
}

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
  pendingUpdates: number;
}

const EnhancedContextIndicator: React.FC<ContextIndicatorProps> = ({
  hasContext,
  contextPhones,
  onClearContext,
  sessionId,
  showDetails = false,
  showSyncStatus = true,
  onContextUpdate
}) => {
  const [contextDetails, setContextDetails] = useState<ContextDetails | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: 0,
    syncInProgress: false,
    pendingUpdates: 0,
  });

  const { refreshMetadata } = useContextMetadata();

  // Fetch detailed context information
  const fetchContextDetails = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const context = await contextualAPI.getContext(sessionId);
      setContextDetails({
        sessionAge: context.context_metadata.session_age,
        totalQueries: context.context_metadata.total_queries,
        contextStrength: context.context_metadata.context_strength,
        userPreferences: context.user_preferences,
        lastActivity: context.context_metadata.last_activity,
      });
    } catch (error) {
      console.warn('Failed to fetch context details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  // Update sync status from context sync service
  const updateSyncStatus = useCallback(() => {
    const status = contextSync.getSyncStatus();
    setSyncStatus({
      isOnline: status.isOnline,
      lastSyncTime: status.lastSyncTime,
      syncInProgress: status.syncInProgress,
      pendingUpdates: status.pendingUpdates.length,
    });
  }, []);

  // Fetch detailed context information
  useEffect(() => {
    if (hasContext && showDetails && sessionId) {
      fetchContextDetails();
    }
  }, [hasContext, showDetails, sessionId, fetchContextDetails]);

  // Set up sync status listeners
  useEffect(() => {
    updateSyncStatus();

    const handleSyncStart = () => setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
    const handleSyncComplete = () => {
      updateSyncStatus();
      if (onContextUpdate) {
        refreshMetadata();
      }
    };
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));
    const handlePendingUpdate = () => updateSyncStatus();

    contextSync.on('syncStart', handleSyncStart);
    contextSync.on('syncComplete', handleSyncComplete);
    contextSync.on('online', handleOnline);
    contextSync.on('offline', handleOffline);
    contextSync.on('pendingUpdate', handlePendingUpdate);

    return () => {
      contextSync.off('syncStart', handleSyncStart);
      contextSync.off('syncComplete', handleSyncComplete);
      contextSync.off('online', handleOnline);
      contextSync.off('offline', handleOffline);
      contextSync.off('pendingUpdate', handlePendingUpdate);
    };
  }, [updateSyncStatus, onContextUpdate, refreshMetadata]);

  const handleClearContext = useCallback(() => {
    if (onClearContext) {
      onClearContext();
      contextualAPI.clearSession();
      contextSync.clearPendingUpdates();
      setContextDetails(null);
      updateSyncStatus();
    }
  }, [onClearContext, updateSyncStatus]);

  const handleForceSync = useCallback(async () => {
    try {
      await contextSync.forcSync();
      if (onContextUpdate) {
        refreshMetadata();
      }
    } catch (error) {
      console.warn('Failed to force sync:', error);
    }
  }, [onContextUpdate, refreshMetadata]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getContextStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-green-600 bg-green-100';
    if (strength >= 0.6) return 'text-blue-600 bg-blue-100';
    if (strength >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getContextStrengthLabel = (strength: number) => {
    if (strength >= 0.8) return 'Strong';
    if (strength >= 0.6) return 'Good';
    if (strength >= 0.4) return 'Moderate';
    return 'Weak';
  };

  if (!hasContext || contextPhones.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          </div>
          <span className="text-sm text-blue-700 font-medium">
            Context Active
          </span>
          {contextDetails && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getContextStrengthColor(contextDetails.contextStrength)}`}>
              {getContextStrengthLabel(contextDetails.contextStrength)}
            </span>
          )}
          {showSyncStatus && (
            <div className="flex items-center space-x-1">
              {syncStatus.syncInProgress ? (
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" title="Syncing..."></div>
              ) : syncStatus.isOnline ? (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Online"></div>
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" title="Offline"></div>
              )}
              {syncStatus.pendingUpdates > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded" title={`${syncStatus.pendingUpdates} pending updates`}>
                  {syncStatus.pendingUpdates}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {showSyncStatus && syncStatus.pendingUpdates > 0 && (
            <button
              onClick={handleForceSync}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              title="Force sync pending updates"
              disabled={syncStatus.syncInProgress}
            >
              Sync
            </button>
          )}
          {showDetails && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              disabled={isLoading}
            >
              {isExpanded ? 'Less' : 'Details'}
            </button>
          )}
          {onClearContext && (
            <button
              onClick={handleClearContext}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
              title="Clear conversation context"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-2">
        <span className="text-xs text-blue-600">
          Discussing: {contextPhones.slice(0, 3).join(', ')}
          {contextPhones.length > 3 && (
            <span className="font-medium"> and {contextPhones.length - 3} more</span>
          )}
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && contextDetails && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-blue-500 font-medium">Session:</span>
              <div className="text-blue-700">
                {contextDetails.totalQueries} queries
              </div>
              <div className="text-blue-600">
                {formatTimeAgo(contextDetails.lastActivity)}
              </div>
            </div>
            
            {contextDetails.userPreferences && Object.keys(contextDetails.userPreferences).length > 0 && (
              <div>
                <span className="text-blue-500 font-medium">Preferences:</span>
                <div className="text-blue-700">
                  {contextDetails.userPreferences.budget_category && (
                    <div>{contextDetails.userPreferences.budget_category} budget</div>
                  )}
                  {contextDetails.userPreferences.preferred_brands && contextDetails.userPreferences.preferred_brands.length > 0 && (
                    <div>{contextDetails.userPreferences.preferred_brands.slice(0, 2).join(', ')}</div>
                  )}
                  {contextDetails.userPreferences.important_features && contextDetails.userPreferences.important_features.length > 0 && (
                    <div>{contextDetails.userPreferences.important_features.slice(0, 2).join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {showSyncStatus && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-blue-500 font-medium">Sync Status:</span>
                  <div className="text-blue-700">
                    {syncStatus.isOnline ? 'Online' : 'Offline'}
                  </div>
                  {syncStatus.lastSyncTime > 0 && (
                    <div className="text-blue-600">
                      Last sync: {formatTimeAgo(new Date(syncStatus.lastSyncTime).toISOString())}
                    </div>
                  )}
                </div>
                
                {syncStatus.pendingUpdates > 0 && (
                  <div>
                    <span className="text-blue-500 font-medium">Pending:</span>
                    <div className="text-blue-700">
                      {syncStatus.pendingUpdates} updates
                    </div>
                    <div className="text-blue-600">
                      Will sync when online
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator for details */}
      {isLoading && (
        <div className="mt-2 flex items-center space-x-2">
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-blue-600">Loading context details...</span>
        </div>
      )}
    </div>
  );
};

export default EnhancedContextIndicator;