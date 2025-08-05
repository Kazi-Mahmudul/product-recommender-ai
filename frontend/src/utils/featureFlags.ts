// Feature flag system for gradual rollout of enhanced chat features

export interface FeatureFlags {
  enhancedSuggestions: boolean;
  drillDownMode: boolean;
  contextManagement: boolean;
  enhancedComparison: boolean;
  mobileOptimizations: boolean;
  errorRecovery: boolean;
  aiResponseEnhancements: boolean;
}

export class FeatureFlagManager {
  private static readonly STORAGE_KEY = 'epick_feature_flags';
  private static readonly DEFAULT_FLAGS: FeatureFlags = {
    enhancedSuggestions: true,
    drillDownMode: true,
    contextManagement: true,
    enhancedComparison: true,
    mobileOptimizations: true,
    errorRecovery: true,
    aiResponseEnhancements: true
  };

  /**
   * Get current feature flags
   */
  static getFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.DEFAULT_FLAGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load feature flags:', error);
    }
    
    return this.DEFAULT_FLAGS;
  }

  /**
   * Update feature flags
   */
  static updateFlags(flags: Partial<FeatureFlags>): void {
    try {
      const currentFlags = this.getFlags();
      const updatedFlags = { ...currentFlags, ...flags };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedFlags));
    } catch (error) {
      console.warn('Failed to save feature flags:', error);
    }
  }

  /**
   * Check if a specific feature is enabled
   */
  static isEnabled(feature: keyof FeatureFlags): boolean {
    return this.getFlags()[feature];
  }

  /**
   * Enable a feature
   */
  static enableFeature(feature: keyof FeatureFlags): void {
    this.updateFlags({ [feature]: true });
  }

  /**
   * Disable a feature
   */
  static disableFeature(feature: keyof FeatureFlags): void {
    this.updateFlags({ [feature]: false });
  }

  /**
   * Reset all flags to default
   */
  static resetToDefaults(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get feature flag status for debugging
   */
  static getDebugInfo(): {
    flags: FeatureFlags;
    enabledCount: number;
    disabledCount: number;
  } {
    const flags = this.getFlags();
    const entries = Object.entries(flags);
    const enabledCount = entries.filter(([, enabled]) => enabled).length;
    const disabledCount = entries.length - enabledCount;

    return {
      flags,
      enabledCount,
      disabledCount
    };
  }

  /**
   * Enable features based on user segment or A/B testing
   */
  static configureForUserSegment(segment: 'beta' | 'stable' | 'experimental'): void {
    switch (segment) {
      case 'experimental':
        this.updateFlags({
          enhancedSuggestions: true,
          drillDownMode: true,
          contextManagement: true,
          enhancedComparison: true,
          mobileOptimizations: true,
          errorRecovery: true,
          aiResponseEnhancements: true
        });
        break;
      
      case 'beta':
        this.updateFlags({
          enhancedSuggestions: true,
          drillDownMode: true,
          contextManagement: true,
          enhancedComparison: true,
          mobileOptimizations: true,
          errorRecovery: true,
          aiResponseEnhancements: false // Keep AI enhancements in experimental
        });
        break;
      
      case 'stable':
        this.updateFlags({
          enhancedSuggestions: true,
          drillDownMode: false, // Keep drill-down in beta
          contextManagement: true,
          enhancedComparison: true,
          mobileOptimizations: true,
          errorRecovery: true,
          aiResponseEnhancements: false
        });
        break;
    }
  }
}

/**
 * React hook for using feature flags
 */
export const useFeatureFlags = (): FeatureFlags & {
  updateFlag: (feature: keyof FeatureFlags, enabled: boolean) => void;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
} => {
  const flags = FeatureFlagManager.getFlags();

  const updateFlag = (feature: keyof FeatureFlags, enabled: boolean) => {
    if (enabled) {
      FeatureFlagManager.enableFeature(feature);
    } else {
      FeatureFlagManager.disableFeature(feature);
    }
    // Force re-render by updating localStorage and letting the component re-read
    window.dispatchEvent(new Event('storage'));
  };

  const isEnabled = (feature: keyof FeatureFlags) => {
    return flags[feature];
  };

  return {
    ...flags,
    updateFlag,
    isEnabled
  };
};

// Export convenience functions
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => 
  FeatureFlagManager.isEnabled(feature);

export const enableFeature = (feature: keyof FeatureFlags): void => 
  FeatureFlagManager.enableFeature(feature);

export const disableFeature = (feature: keyof FeatureFlags): void => 
  FeatureFlagManager.disableFeature(feature);

export const toggleFeature = (feature: keyof FeatureFlags): boolean => {
  const currentValue = FeatureFlagManager.isEnabled(feature);
  if (currentValue) {
    FeatureFlagManager.disableFeature(feature);
  } else {
    FeatureFlagManager.enableFeature(feature);
  }
  return !currentValue;
};