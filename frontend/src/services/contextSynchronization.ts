/**
 * Context Synchronization Service
 * Handles real-time context synchronization between frontend and backend
 */

import { contextualAPI, ContextRetrievalResponse } from '../api/contextual';
import { Phone } from '../api/phones';

export interface ContextSyncState {
  isOnline: boolean;
  lastSyncTime: number;
  syncInProgress: boolean;
  pendingUpdates: ContextUpdate[];
  conflictResolution: 'client' | 'server' | 'merge';
}

export interface ContextUpdate {
  id: string;
  type: 'query' | 'preference' | 'phone_interaction' | 'session_data';
  timestamp: number;
  data: any;
  synced: boolean;
}

export interface SyncOptions {
  forceSync?: boolean;
  conflictResolution?: 'client' | 'server' | 'merge';
  retryOnFailure?: boolean;
  maxRetries?: number;
}

class ContextSynchronizationService {
  private static instance: ContextSynchronizationService;
  private syncState: ContextSyncState;
  private syncInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly STORAGE_KEY = 'context_sync_state';
  private readonly MAX_PENDING_UPDATES = 100;

  private constructor() {
    this.syncState = this.loadSyncState();
    this.initializeOnlineDetection();
    this.startPeriodicSync();
  }

  public static getInstance(): ContextSynchronizationService {
    if (!ContextSynchronizationService.instance) {
      ContextSynchronizationService.instance = new ContextSynchronizationService();
    }
    return ContextSynchronizationService.instance;
  }

  /**
   * Initialize online/offline detection
   */
  private initializeOnlineDetection(): void {
    this.syncState.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.syncState.isOnline = true;
      this.emit('online');
      this.syncPendingUpdates();
    });

    window.addEventListener('offline', () => {
      this.syncState.isOnline = false;
      this.emit('offline');
    });
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.syncState.isOnline && !this.syncState.syncInProgress) {
        this.syncContext();
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Load sync state from storage
   */
  private loadSyncState(): ContextSyncState {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          isOnline: navigator.onLine,
          syncInProgress: false, // Reset on load
        };
      }
    } catch (error) {
      console.warn('Failed to load sync state:', error);
    }

    return {
      isOnline: navigator.onLine,
      lastSyncTime: 0,
      syncInProgress: false,
      pendingUpdates: [],
      conflictResolution: 'merge',
    };
  }

  /**
   * Save sync state to storage
   */
  private saveSyncState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.syncState));
    } catch (error) {
      console.warn('Failed to save sync state:', error);
    }
  }

  /**
   * Add context update to pending queue
   */
  public addPendingUpdate(update: Omit<ContextUpdate, 'id' | 'synced'>): void {
    const contextUpdate: ContextUpdate = {
      ...update,
      id: this.generateUpdateId(),
      synced: false,
    };

    this.syncState.pendingUpdates.push(contextUpdate);

    // Limit pending updates to prevent memory issues
    if (this.syncState.pendingUpdates.length > this.MAX_PENDING_UPDATES) {
      this.syncState.pendingUpdates = this.syncState.pendingUpdates.slice(-this.MAX_PENDING_UPDATES);
    }

    this.saveSyncState();
    this.emit('pendingUpdate', contextUpdate);

    // Try to sync immediately if online
    if (this.syncState.isOnline && !this.syncState.syncInProgress) {
      this.syncPendingUpdates();
    }
  }

  /**
   * Sync context with backend
   */
  public async syncContext(options: SyncOptions = {}): Promise<boolean> {
    if (this.syncState.syncInProgress) {
      return false;
    }

    if (!this.syncState.isOnline && !options.forceSync) {
      return false;
    }

    this.syncState.syncInProgress = true;
    this.emit('syncStart');

    try {
      // Get current backend context
      const backendContext = await contextualAPI.getContext();
      
      // Get local context (if available)
      const localContext = this.getLocalContext();

      // Resolve conflicts if both exist
      if (localContext && backendContext) {
        const resolvedContext = await this.resolveContextConflicts(
          localContext,
          backendContext,
          options.conflictResolution || this.syncState.conflictResolution
        );

        // Update backend with resolved context if needed
        if (resolvedContext !== backendContext) {
          await this.updateBackendContext(resolvedContext);
        }
      }

      // Sync pending updates
      await this.syncPendingUpdates();

      this.syncState.lastSyncTime = Date.now();
      this.syncState.syncInProgress = false;
      this.saveSyncState();
      this.emit('syncComplete', { success: true });

      return true;

    } catch (error) {
      console.error('Context sync failed:', error);
      this.syncState.syncInProgress = false;
      this.emit('syncComplete', { success: false, error });

      if (options.retryOnFailure) {
        setTimeout(() => this.syncContext(options), 5000);
      }

      return false;
    }
  }

  /**
   * Sync pending updates to backend
   */
  private async syncPendingUpdates(): Promise<void> {
    const unsyncedUpdates = this.syncState.pendingUpdates.filter(update => !update.synced);
    
    for (const update of unsyncedUpdates) {
      try {
        await this.syncSingleUpdate(update);
        update.synced = true;
        this.emit('updateSynced', update);
      } catch (error) {
        console.warn('Failed to sync update:', update.id, error);
        // Keep unsynced for retry
      }
    }

    // Remove synced updates
    this.syncState.pendingUpdates = this.syncState.pendingUpdates.filter(update => !update.synced);
    this.saveSyncState();
  }

  /**
   * Sync a single update to backend
   */
  private async syncSingleUpdate(update: ContextUpdate): Promise<void> {
    switch (update.type) {
      case 'query':
        // Query updates are handled by the contextual API automatically
        break;
      
      case 'preference':
        await contextualAPI.updateUserPreferences(update.data);
        break;
      
      case 'phone_interaction':
        // Track phone interactions (views, comparisons, etc.)
        // This would be handled by analytics service
        break;
      
      case 'session_data':
        // Update session-specific data
        // This might involve custom endpoints
        break;
      
      default:
        console.warn('Unknown update type:', update.type);
    }
  }

  /**
   * Resolve conflicts between local and backend context
   */
  private async resolveContextConflicts(
    localContext: any,
    backendContext: ContextRetrievalResponse,
    strategy: 'client' | 'server' | 'merge'
  ): Promise<any> {
    switch (strategy) {
      case 'client':
        return localContext;
      
      case 'server':
        return backendContext;
      
      case 'merge':
      default:
        return this.mergeContexts(localContext, backendContext);
    }
  }

  /**
   * Merge local and backend contexts intelligently
   */
  private mergeContexts(localContext: any, backendContext: ContextRetrievalResponse): any {
    // Merge strategy:
    // - Use most recent timestamps for individual items
    // - Combine unique items from both contexts
    // - Prefer backend for authoritative data (user preferences)
    // - Prefer local for recent interactions

    const merged = {
      ...backendContext,
      conversation_history: this.mergeConversationHistory(
        localContext.conversation_history || [],
        backendContext.conversation_history
      ),
      context_phones: this.mergePhoneContext(
        localContext.context_phones || [],
        backendContext.context_phones
      ),
      user_preferences: {
        ...localContext.user_preferences,
        ...backendContext.user_preferences,
      },
    };

    return merged;
  }

  /**
   * Merge conversation histories
   */
  private mergeConversationHistory(local: any[], backend: any[]): any[] {
    const combined = [...local, ...backend];
    const unique = combined.filter((item, index, arr) => 
      arr.findIndex(other => 
        other.timestamp === item.timestamp && other.query === item.query
      ) === index
    );
    
    return unique.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Merge phone contexts
   */
  private mergePhoneContext(local: Phone[], backend: Phone[]): Phone[] {
    const phoneMap = new Map<number, Phone>();
    
    // Add backend phones first
    backend.forEach(phone => phoneMap.set(phone.id, phone));
    
    // Add local phones (may override if more recent)
    local.forEach(phone => {
      if (!phoneMap.has(phone.id) || this.isMoreRecent(phone, phoneMap.get(phone.id)!)) {
        phoneMap.set(phone.id, phone);
      }
    });
    
    return Array.from(phoneMap.values());
  }

  /**
   * Check if one phone context is more recent than another
   */
  private isMoreRecent(phone1: any, phone2: any): boolean {
    const timestamp1 = phone1.last_accessed || phone1.timestamp || 0;
    const timestamp2 = phone2.last_accessed || phone2.timestamp || 0;
    return timestamp1 > timestamp2;
  }

  /**
   * Update backend context
   */
  private async updateBackendContext(context: any): Promise<void> {
    // This would require a backend endpoint to update context
    // For now, we'll use individual update methods
    if (context.user_preferences) {
      await contextualAPI.updateUserPreferences(context.user_preferences);
    }
  }

  /**
   * Get local context from storage
   */
  private getLocalContext(): any {
    try {
      const stored = localStorage.getItem('contextual_context_cache');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get local context:', error);
      return null;
    }
  }

  /**
   * Event system for sync notifications
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): ContextSyncState {
    return { ...this.syncState };
  }

  /**
   * Force immediate sync
   */
  public async forcSync(): Promise<boolean> {
    return this.syncContext({ forceSync: true });
  }

  /**
   * Clear all pending updates
   */
  public clearPendingUpdates(): void {
    this.syncState.pendingUpdates = [];
    this.saveSyncState();
    this.emit('pendingUpdatesCleared');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const contextSync = ContextSynchronizationService.getInstance();

export default contextSync;