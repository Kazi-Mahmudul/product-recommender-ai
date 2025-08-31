/**
 * System Validator
 * 
 * Comprehensive validation and integration testing for the smart chat system.
 * Validates all components work together correctly and provides system health reports.
 */

import { ResponseCacheService } from '../services/responseCacheService';
import { PerformanceOptimizer } from '../services/performanceOptimizer';
import { ErrorRecoveryService } from '../services/errorRecoveryService';
import { IntelligentContextManager, ConversationContext } from '../services/intelligentContextManager';

export interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export interface SystemHealthReport {
  overall_status: 'healthy' | 'degraded' | 'critical';
  validation_results: ValidationResult[];
  performance_metrics: any;
  recommendations: string[];
  timestamp: Date;
}

export class SystemValidator {
  private static readonly TEST_QUERIES = [
    'Best phones under 30k',
    'Compare iPhone 14 vs Samsung Galaxy S23',
    'What is the camera quality of iPhone 14?',
    'Recommend gaming phones',
    'Phones with long battery life'
  ];

  private static readonly API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

  /**
   * Run comprehensive system validation
   */
  static async validateSystem(): Promise<SystemHealthReport> {
    console.log('🔍 Starting comprehensive system validation...');
    
    const validationResults: ValidationResult[] = [];
    const startTime = Date.now();

    try {
      // 1. Validate service initialization
      validationResults.push(...await this.validateServiceInitialization());

      // 2. Validate context management
      validationResults.push(...await this.validateContextManagement());

      // 3. Validate caching system
      validationResults.push(...await this.validateCachingSystem());

      // 4. Validate error handling
      validationResults.push(...await this.validateErrorHandling());

      // 5. Validate performance optimization
      validationResults.push(...await this.validatePerformanceOptimization());

      // 6. Validate API integration
      validationResults.push(...await this.validateAPIIntegration());

      // 7. Validate end-to-end flow
      validationResults.push(...await this.validateEndToEndFlow());

      // Generate overall status and recommendations
      const overallStatus = this.determineOverallStatus(validationResults);
      const recommendations = this.generateRecommendations(validationResults);
      const performanceMetrics = PerformanceOptimizer.getMetrics();

      const report: SystemHealthReport = {
        overall_status: overallStatus,
        validation_results: validationResults,
        performance_metrics: performanceMetrics,
        recommendations,
        timestamp: new Date()
      };

      console.log(`✅ System validation completed in ${Date.now() - startTime}ms`);
      console.log(`📊 Overall status: ${overallStatus}`);
      
      return report;

    } catch (error) {
      console.error('❌ System validation failed:', error);
      
      return {
        overall_status: 'critical',
        validation_results: [{
          component: 'system_validator',
          status: 'fail',
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime
        }],
        performance_metrics: {},
        recommendations: ['Fix critical system validation errors'],
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate service initialization
   */
  private static async validateServiceInitialization(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      // Test ResponseCacheService
      const cacheStart = Date.now();
      ResponseCacheService.initialize();
      const cacheStats = ResponseCacheService.getCacheStats();
      
      results.push({
        component: 'response_cache_service',
        status: 'pass',
        message: 'Cache service initialized successfully',
        details: cacheStats,
        duration: Date.now() - cacheStart
      });

      // Test PerformanceOptimizer
      const perfStart = Date.now();
      PerformanceOptimizer.initialize();
      const perfMetrics = PerformanceOptimizer.getMetrics();
      
      results.push({
        component: 'performance_optimizer',
        status: 'pass',
        message: 'Performance optimizer initialized successfully',
        details: perfMetrics,
        duration: Date.now() - perfStart
      });

      // Test ErrorRecoveryService
      const errorStart = Date.now();
      const healthCheck = await ErrorRecoveryService.checkSystemHealth();
      
      results.push({
        component: 'error_recovery_service',
        status: healthCheck.isHealthy ? 'pass' : 'warning',
        message: healthCheck.isHealthy ? 'Error recovery service healthy' : 'System health issues detected',
        details: healthCheck,
        duration: Date.now() - errorStart
      });

    } catch (error) {
      results.push({
        component: 'service_initialization',
        status: 'fail',
        message: `Service initialization failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate context management
   */
  private static async validateContextManagement(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Create test context
      const context = IntelligentContextManager.createInitialContext('test-validation');
      
      // Test context relevance analysis
      const relevanceResult = IntelligentContextManager.analyzeContextRelevance(
        'What about that iPhone we discussed?',
        context
      );
      
      if (relevanceResult.context_type === 'follow_up') {
        results.push({
          component: 'context_relevance_analysis',
          status: 'pass',
          message: 'Context relevance analysis working correctly',
          details: relevanceResult,
          duration: Date.now() - start
        });
      } else {
        results.push({
          component: 'context_relevance_analysis',
          status: 'warning',
          message: 'Context relevance analysis may have issues',
          details: relevanceResult
        });
      }

      // Test topic shift detection
      context.conversation_flow.current_topic = 'camera';
      const topicShift = IntelligentContextManager.detectTopicShift('What about battery life?', context);
      
      if (topicShift.shift_detected && topicShift.new_topic === 'battery') {
        results.push({
          component: 'topic_shift_detection',
          status: 'pass',
          message: 'Topic shift detection working correctly',
          details: topicShift
        });
      } else {
        results.push({
          component: 'topic_shift_detection',
          status: 'warning',
          message: 'Topic shift detection may have issues',
          details: topicShift
        });
      }

      // Test context updates
      const updatedContext = IntelligentContextManager.updateConversationState(
        context,
        'Tell me about iPhone 14',
        { phones: [{ name: 'iPhone 14', brand: 'Apple' }] }
      );

      if (updatedContext.mentioned_phones.length > 0) {
        results.push({
          component: 'context_updates',
          status: 'pass',
          message: 'Context updates working correctly',
          details: { phone_count: updatedContext.mentioned_phones.length }
        });
      } else {
        results.push({
          component: 'context_updates',
          status: 'fail',
          message: 'Context updates not working properly'
        });
      }

    } catch (error) {
      results.push({
        component: 'context_management',
        status: 'fail',
        message: `Context management validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate caching system
   */
  private static async validateCachingSystem(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Test cache write and read
      const testQuery = 'test validation query';
      const testResponse = { type: 'test', data: 'validation response' };
      
      await ResponseCacheService.cacheResponse(testQuery, testResponse);
      const cachedResponse = await ResponseCacheService.getCachedResponse(testQuery);
      
      if (cachedResponse && JSON.stringify(cachedResponse) === JSON.stringify(testResponse)) {
        results.push({
          component: 'cache_read_write',
          status: 'pass',
          message: 'Cache read/write operations working correctly',
          duration: Date.now() - start
        });
      } else {
        results.push({
          component: 'cache_read_write',
          status: 'fail',
          message: 'Cache read/write operations not working properly',
          details: { expected: testResponse, actual: cachedResponse }
        });
      }

      // Test cache similarity matching
      const similarQuery = 'test validation query with extra words';
      const similarResponse = await ResponseCacheService.getCachedResponse(similarQuery);
      
      if (similarResponse) {
        results.push({
          component: 'cache_similarity',
          status: 'pass',
          message: 'Cache similarity matching working correctly'
        });
      } else {
        results.push({
          component: 'cache_similarity',
          status: 'warning',
          message: 'Cache similarity matching may need tuning'
        });
      }

      // Test cache stats
      const cacheStats = ResponseCacheService.getCacheStats();
      if (cacheStats.totalEntries > 0) {
        results.push({
          component: 'cache_stats',
          status: 'pass',
          message: 'Cache statistics tracking working correctly',
          details: cacheStats
        });
      } else {
        results.push({
          component: 'cache_stats',
          status: 'warning',
          message: 'Cache statistics may not be tracking properly',
          details: cacheStats
        });
      }

    } catch (error) {
      results.push({
        component: 'caching_system',
        status: 'fail',
        message: `Caching system validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate error handling
   */
  private static async validateErrorHandling(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Test network error handling
      const networkError = new Error('Network request failed');
      const errorContext = {
        errorType: 'NetworkError',
        originalQuery: 'test query',
        attemptCount: 0,
        timestamp: new Date()
      };
      
      const recoveryStrategy = ErrorRecoveryService.analyzeError(networkError, errorContext);
      
      if (recoveryStrategy.canRecover && recoveryStrategy.recoveryType === 'retry') {
        results.push({
          component: 'network_error_handling',
          status: 'pass',
          message: 'Network error handling working correctly',
          details: recoveryStrategy,
          duration: Date.now() - start
        });
      } else {
        results.push({
          component: 'network_error_handling',
          status: 'fail',
          message: 'Network error handling not working properly',
          details: recoveryStrategy
        });
      }

      // Test contextual error messages
      const context = IntelligentContextManager.createInitialContext('test');
      context.recent_topics = ['camera'];
      
      const contextualError = ErrorRecoveryService.generateContextualErrorMessage(
        'Test error',
        context
      );
      
      if (contextualError.suggestions.some(s => s.includes('camera'))) {
        results.push({
          component: 'contextual_error_messages',
          status: 'pass',
          message: 'Contextual error messages working correctly',
          details: contextualError
        });
      } else {
        results.push({
          component: 'contextual_error_messages',
          status: 'warning',
          message: 'Contextual error messages may need improvement',
          details: contextualError
        });
      }

    } catch (error) {
      results.push({
        component: 'error_handling',
        status: 'fail',
        message: `Error handling validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate performance optimization
   */
  private static async validatePerformanceOptimization(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Test parallel processing
      const context = IntelligentContextManager.createInitialContext('test');
      const mockApiCall = async () => ({ type: 'test', data: 'mock response' });
      
      const optimizedResult = await PerformanceOptimizer.optimizeQueryProcessing(
        'test query',
        context,
        mockApiCall
      );
      
      if (optimizedResult.response && optimizedResult.contextAnalysis && optimizedResult.processingTime > 0) {
        results.push({
          component: 'parallel_processing',
          status: 'pass',
          message: 'Parallel processing working correctly',
          details: {
            processingTime: optimizedResult.processingTime,
            hasContextAnalysis: !!optimizedResult.contextAnalysis
          },
          duration: Date.now() - start
        });
      } else {
        results.push({
          component: 'parallel_processing',
          status: 'fail',
          message: 'Parallel processing not working properly',
          details: optimizedResult
        });
      }

      // Test performance metrics
      const metrics = PerformanceOptimizer.getMetrics();
      if (typeof metrics.averageResponseTime === 'number') {
        results.push({
          component: 'performance_metrics',
          status: 'pass',
          message: 'Performance metrics tracking working correctly',
          details: metrics
        });
      } else {
        results.push({
          component: 'performance_metrics',
          status: 'warning',
          message: 'Performance metrics may not be tracking properly',
          details: metrics
        });
      }

    } catch (error) {
      results.push({
        component: 'performance_optimization',
        status: 'fail',
        message: `Performance optimization validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate API integration
   */
  private static async validateAPIIntegration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Test API connectivity (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${this.API_BASE_URL}/health`, {
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          results.push({
            component: 'api_connectivity',
            status: 'pass',
            message: 'API connectivity working correctly',
            details: { status: response.status },
            duration: Date.now() - start
          });
        } else {
          results.push({
            component: 'api_connectivity',
            status: 'warning',
            message: `API returned status ${response.status}`,
            details: { status: response.status }
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          results.push({
            component: 'api_connectivity',
            status: 'warning',
            message: 'API request timed out',
            details: { timeout: 5000 }
          });
        } else {
          results.push({
            component: 'api_connectivity',
            status: 'fail',
            message: `API connectivity failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
            details: { error: fetchError }
          });
        }
      }

    } catch (error) {
      results.push({
        component: 'api_integration',
        status: 'fail',
        message: `API integration validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Validate end-to-end flow
   */
  private static async validateEndToEndFlow(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    try {
      const start = Date.now();
      
      // Test complete query processing flow
      for (const testQuery of this.TEST_QUERIES.slice(0, 2)) { // Test first 2 queries
        try {
          const queryStart = Date.now();
          
          // Simulate the complete flow
          const context = IntelligentContextManager.createInitialContext('e2e-test');
          
          // 1. Context analysis
          const relevanceAnalysis = IntelligentContextManager.analyzeContextRelevance(testQuery, context);
          
          // 2. Query enhancement
          const enhancedQuery = IntelligentContextManager.buildContextualQuery(
            testQuery,
            context,
            relevanceAnalysis
          );
          
          // 3. Cache check (should miss for test)
          const cachedResponse = await ResponseCacheService.getCachedResponse(enhancedQuery, context);
          
          // 4. Performance optimization simulation
          const mockApiCall = async () => ({
            response_type: 'text',
            content: { text: `Mock response for: ${testQuery}` }
          });
          
          const optimizedResult = await PerformanceOptimizer.optimizeQueryProcessing(
            enhancedQuery,
            context,
            mockApiCall
          );
          
          // 5. Context update
          const updatedContext = IntelligentContextManager.updateConversationState(
            context,
            testQuery,
            optimizedResult.response
          );
          
          // 6. Cache the response
          await ResponseCacheService.cacheResponse(enhancedQuery, optimizedResult.response, updatedContext);
          
          const queryDuration = Date.now() - queryStart;
          
          results.push({
            component: `e2e_flow_${testQuery.replace(/\s+/g, '_').toLowerCase()}`,
            status: 'pass',
            message: `End-to-end flow completed successfully for: ${testQuery}`,
            details: {
              query: testQuery,
              enhanced: enhancedQuery !== testQuery,
              cached: !!cachedResponse,
              contextUpdated: updatedContext.session_metadata.total_queries > 0,
              processingTime: optimizedResult.processingTime
            },
            duration: queryDuration
          });
          
        } catch (queryError) {
          results.push({
            component: `e2e_flow_${testQuery.replace(/\s+/g, '_').toLowerCase()}`,
            status: 'fail',
            message: `End-to-end flow failed for: ${testQuery}`,
            details: { error: queryError instanceof Error ? queryError.message : String(queryError) }
          });
        }
      }
      
      const totalDuration = Date.now() - start;
      
      results.push({
        component: 'e2e_flow_summary',
        status: 'pass',
        message: 'End-to-end flow validation completed',
        details: { 
          totalQueries: this.TEST_QUERIES.slice(0, 2).length,
          totalDuration 
        },
        duration: totalDuration
      });

    } catch (error) {
      results.push({
        component: 'end_to_end_flow',
        status: 'fail',
        message: `End-to-end flow validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }

    return results;
  }

  /**
   * Determine overall system status
   */
  private static determineOverallStatus(results: ValidationResult[]): 'healthy' | 'degraded' | 'critical' {
    const failCount = results.filter(r => r.status === 'fail').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    
    if (failCount > 0) {
      return failCount > 2 ? 'critical' : 'degraded';
    }
    
    if (warningCount > 3) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedComponents = results.filter(r => r.status === 'fail');
    const warningComponents = results.filter(r => r.status === 'warning');
    
    if (failedComponents.length > 0) {
      recommendations.push(`Fix ${failedComponents.length} critical issues: ${failedComponents.map(c => c.component).join(', ')}`);
    }
    
    if (warningComponents.length > 0) {
      recommendations.push(`Address ${warningComponents.length} warnings for optimal performance`);
    }
    
    // Specific recommendations based on component failures
    if (failedComponents.some(c => c.component.includes('api'))) {
      recommendations.push('Check API connectivity and endpoint configuration');
    }
    
    if (failedComponents.some(c => c.component.includes('cache'))) {
      recommendations.push('Verify cache storage and localStorage availability');
    }
    
    if (failedComponents.some(c => c.component.includes('context'))) {
      recommendations.push('Review context management logic and data structures');
    }
    
    if (warningComponents.some(c => c.component.includes('performance'))) {
      recommendations.push('Consider performance optimizations and resource cleanup');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is operating optimally');
    }
    
    return recommendations;
  }

  /**
   * Generate validation report summary
   */
  static generateReportSummary(report: SystemHealthReport): string {
    const passCount = report.validation_results.filter(r => r.status === 'pass').length;
    const warningCount = report.validation_results.filter(r => r.status === 'warning').length;
    const failCount = report.validation_results.filter(r => r.status === 'fail').length;
    
    return `
🔍 Smart Chat System Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overall Status: ${report.overall_status.toUpperCase()}
📅 Timestamp: ${report.timestamp.toISOString()}

📈 Results Summary:
  ✅ Passed: ${passCount}
  ⚠️  Warnings: ${warningCount}
  ❌ Failed: ${failCount}
  📝 Total: ${report.validation_results.length}

🎯 Key Recommendations:
${report.recommendations.map(r => `  • ${r}`).join('\n')}

⚡ Performance Metrics:
  • Average Response Time: ${report.performance_metrics.averageResponseTime?.toFixed(2) || 'N/A'}ms
  • Total Requests: ${report.performance_metrics.totalRequests || 0}
  • Error Rate: ${(report.performance_metrics.errorRate * 100)?.toFixed(1) || 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }
}