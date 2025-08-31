/**
 * Smart Chat System Initializer
 * 
 * Comprehensive initialization and validation for the smart chat integration system.
 * Ensures all components are properly configured and working together.
 */

import { ResponseCacheService } from '../services/responseCacheService';
import { PerformanceOptimizer } from '../services/performanceOptimizer';
import { ErrorRecoveryService } from '../services/errorRecoveryService';
import { SystemValidator } from './systemValidator';

export interface InitializationConfig {
  enableValidation: boolean;
  enablePerformanceMonitoring: boolean;
  enableCaching: boolean;
  enableErrorRecovery: boolean;
  cacheConfig?: {
    maxEntries?: number;
    maxAge?: number;
    similarityThreshold?: number;
  };
  performanceConfig?: {
    enableParallelProcessing?: boolean;
    enableRequestDebouncing?: boolean;
    maxConcurrentRequests?: number;
  };
}

export interface InitializationResult {
  success: boolean;
  services: {
    cache: boolean;
    performance: boolean;
    errorRecovery: boolean;
  };
  validationReport?: any;
  errors: string[];
  warnings: string[];
  duration: number;
}

export class SmartChatInitializer {
  private static readonly DEFAULT_CONFIG: InitializationConfig = {
    enableValidation: true,
    enablePerformanceMonitoring: true,
    enableCaching: true,
    enableErrorRecovery: true,
    cacheConfig: {
      maxEntries: 50,
      maxAge: 20 * 60 * 1000, // 20 minutes
      similarityThreshold: 0.8
    },
    performanceConfig: {
      enableParallelProcessing: true,
      enableRequestDebouncing: true,
      maxConcurrentRequests: 2
    }
  };

  /**
   * Initialize the complete smart chat system
   */
  static async initialize(config: Partial<InitializationConfig> = {}): Promise<InitializationResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    console.log('🚀 Initializing Smart Chat Integration System...');
    
    const result: InitializationResult = {
      success: false,
      services: {
        cache: false,
        performance: false,
        errorRecovery: false
      },
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      // 1. Initialize Response Cache Service
      if (finalConfig.enableCaching) {
        try {
          console.log('📦 Initializing Response Cache Service...');
          ResponseCacheService.initialize({
            maxEntries: finalConfig.cacheConfig?.maxEntries || 50,
            maxAge: finalConfig.cacheConfig?.maxAge || 20 * 60 * 1000,
            similarityThreshold: finalConfig.cacheConfig?.similarityThreshold || 0.8,
            enableContextAwareness: true
          });
          
          result.services.cache = true;
          console.log('✅ Response Cache Service initialized');
        } catch (error) {
          const errorMsg = `Failed to initialize cache service: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // 2. Initialize Performance Optimizer
      if (finalConfig.enablePerformanceMonitoring) {
        try {
          console.log('⚡ Initializing Performance Optimizer...');
          PerformanceOptimizer.initialize({
            enableParallelProcessing: finalConfig.performanceConfig?.enableParallelProcessing || true,
            enableRequestDebouncing: finalConfig.performanceConfig?.enableRequestDebouncing || true,
            debounceDelay: 300,
            maxConcurrentRequests: finalConfig.performanceConfig?.maxConcurrentRequests || 2,
            enableMemoryCleanup: true,
            cleanupInterval: 5 * 60 * 1000,
            enablePerformanceMonitoring: true
          });
          
          result.services.performance = true;
          console.log('✅ Performance Optimizer initialized');
        } catch (error) {
          const errorMsg = `Failed to initialize performance optimizer: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // 3. Initialize Error Recovery Service (implicit - no explicit init needed)
      if (finalConfig.enableErrorRecovery) {
        try {
          console.log('🛡️ Validating Error Recovery Service...');
          const healthCheck = await ErrorRecoveryService.checkSystemHealth();
          
          if (!healthCheck.isHealthy) {
            result.warnings.push(`System health issues detected: ${healthCheck.issues.join(', ')}`);
            console.warn('⚠️ System health issues:', healthCheck.issues);
          }
          
          result.services.errorRecovery = true;
          console.log('✅ Error Recovery Service validated');
        } catch (error) {
          const errorMsg = `Failed to validate error recovery service: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // 4. Preload critical resources
      try {
        console.log('🔄 Preloading critical resources...');
        await PerformanceOptimizer.preloadCriticalResources();
        console.log('✅ Critical resources preloaded');
      } catch (error) {
        const warningMsg = `Failed to preload some resources: ${error instanceof Error ? error.message : String(error)}`;
        result.warnings.push(warningMsg);
        console.warn('⚠️', warningMsg);
      }

      // 5. Run system validation if enabled
      if (finalConfig.enableValidation) {
        try {
          console.log('🔍 Running system validation...');
          const validationReport = await SystemValidator.validateSystem();
          result.validationReport = validationReport;
          
          if (validationReport.overall_status === 'critical') {
            result.errors.push('System validation failed with critical issues');
          } else if (validationReport.overall_status === 'degraded') {
            result.warnings.push('System validation completed with warnings');
          }
          
          console.log('✅ System validation completed');
          console.log(SystemValidator.generateReportSummary(validationReport));
        } catch (error) {
          const warningMsg = `System validation failed: ${error instanceof Error ? error.message : String(error)}`;
          result.warnings.push(warningMsg);
          console.warn('⚠️', warningMsg);
        }
      }

      // 6. Warm up cache with common queries
      if (finalConfig.enableCaching && result.services.cache) {
        try {
          console.log('🔥 Warming up cache...');
          const commonQueries = [
            'Best phones under 30k',
            'Compare iPhone vs Samsung',
            'Long battery life phones',
            'Gaming phones',
            'Camera phones'
          ];
          
          await ResponseCacheService.warmCache(commonQueries);
          console.log('✅ Cache warmed up');
        } catch (error) {
          const warningMsg = `Cache warm-up failed: ${error instanceof Error ? error.message : String(error)}`;
          result.warnings.push(warningMsg);
          console.warn('⚠️', warningMsg);
        }
      }

      // Determine overall success
      const criticalServicesWorking = result.services.cache || result.services.performance;
      result.success = criticalServicesWorking && result.errors.length === 0;
      
      result.duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`🎉 Smart Chat Integration System initialized successfully in ${result.duration}ms`);
        console.log('📊 Services Status:', result.services);
        
        if (result.warnings.length > 0) {
          console.log('⚠️ Warnings:', result.warnings);
        }
      } else {
        console.error(`❌ Smart Chat Integration System initialization failed in ${result.duration}ms`);
        console.error('🚨 Errors:', result.errors);
      }

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error('💥 Critical initialization error:', error);
      
      return result;
    }
  }

  /**
   * Get system status after initialization
   */
  static getSystemStatus(): {
    cache: any;
    performance: any;
    timestamp: Date;
  } {
    return {
      cache: ResponseCacheService.getCacheStats(),
      performance: PerformanceOptimizer.getMetrics(),
      timestamp: new Date()
    };
  }

  /**
   * Cleanup all services
   */
  static cleanup(): void {
    console.log('🧹 Cleaning up Smart Chat Integration System...');
    
    try {
      PerformanceOptimizer.cleanup();
      console.log('✅ Performance Optimizer cleaned up');
    } catch (error) {
      console.warn('⚠️ Performance Optimizer cleanup failed:', error);
    }

    try {
      ResponseCacheService.clearCache();
      console.log('✅ Response Cache cleared');
    } catch (error) {
      console.warn('⚠️ Response Cache cleanup failed:', error);
    }

    console.log('🎯 Smart Chat Integration System cleanup completed');
  }

  /**
   * Reinitialize system with new configuration
   */
  static async reinitialize(config: Partial<InitializationConfig> = {}): Promise<InitializationResult> {
    console.log('🔄 Reinitializing Smart Chat Integration System...');
    
    // Cleanup first
    this.cleanup();
    
    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize with new config
    return this.initialize(config);
  }

  /**
   * Check if system is ready for use
   */
  static isSystemReady(): boolean {
    try {
      const cacheStats = ResponseCacheService.getCacheStats();
      const perfMetrics = PerformanceOptimizer.getMetrics();
      
      // System is ready if at least one service is working
      return (
        (typeof cacheStats.totalEntries === 'number') ||
        (typeof perfMetrics.averageResponseTime === 'number')
      );
    } catch (error) {
      console.warn('System readiness check failed:', error);
      return false;
    }
  }

  /**
   * Get initialization recommendations
   */
  static getInitializationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check browser capabilities
    if (!('localStorage' in window)) {
      recommendations.push('Enable localStorage for optimal caching performance');
    }
    
    if (!('PerformanceObserver' in window)) {
      recommendations.push('Performance monitoring may be limited in this browser');
    }
    
    if (!navigator.onLine) {
      recommendations.push('Internet connection required for full functionality');
    }
    
    // Check memory constraints
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
        recommendations.push('High memory usage detected - consider reducing cache size');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System environment is optimal for smart chat integration');
    }
    
    return recommendations;
  }
}