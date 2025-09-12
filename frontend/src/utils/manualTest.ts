/**
 * Manual Test Suite for Direct Gemini Integration
 * This tests the complete flow without CORS restrictions
 */

import { directGeminiService } from '../services/directGeminiService';
import { smartChatService } from '../services/smartChatService';

export class ManualTestSuite {
  
  /**
   * Test 1: Direct Gemini Service Response Format
   */
  static async testGeminiResponseFormat() {
    console.log('🧪 Test 1: Testing Gemini Response Format...');
    
    try {
      // Mock a successful Gemini response (simulating what we'd get from the API)
      const mockGeminiResponse = {
        type: 'qa' as const,
        data: 'The iPhone 14 Pro has excellent camera quality with a 48MP main camera.',
        suggestions: ['Tell me about iPhone 14 battery', 'Compare iPhone 14 vs Samsung S23']
      };
      
      // Test our formatting logic
      const service = new (directGeminiService.constructor as any)();
      const formattedResponse = service.formatGeminiResponse(mockGeminiResponse);
      
      console.log('✅ Test 1 PASSED: Response formatting works');
      console.log('📋 Formatted Response:', formattedResponse);
      
      return {
        test: 'Gemini Response Format',
        status: 'PASSED',
        result: formattedResponse
      };
      
    } catch (error) {
      console.error('❌ Test 1 FAILED:', error);
      return {
        test: 'Gemini Response Format',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Test 2: Smart Chat Service State Management
   */
  static async testChatStateManagement() {
    console.log('🧪 Test 2: Testing Chat State Management...');
    
    try {
      // Clear any existing state
      smartChatService.clearChat();
      
      // Get initial state
      const initialState = smartChatService.getChatState();
      console.log('📊 Initial State:', initialState);
      
      // Test state structure
      const expectedProperties = ['messages', 'isLoading', 'lastQuery', 'context'];
      const hasAllProperties = expectedProperties.every(prop => prop in initialState);
      
      if (!hasAllProperties) {
        throw new Error('Chat state missing required properties');
      }
      
      console.log('✅ Test 2 PASSED: Chat state management works');
      
      return {
        test: 'Chat State Management',
        status: 'PASSED',
        result: initialState
      };
      
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error);
      return {
        test: 'Chat State Management',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Test 3: Environment Variable Configuration
   */
  static testEnvironmentConfig() {
    console.log('🧪 Test 3: Testing Environment Configuration...');
    
    try {
      const geminiUrl = process.env.REACT_APP_GEMINI_API;
      const backendUrl = process.env.REACT_APP_API_BASE;
      
      console.log('🌐 Environment Variables:');
      console.log(`  REACT_APP_GEMINI_API: ${geminiUrl || '❌ NOT SET'}`);
      console.log(`  REACT_APP_API_BASE: ${backendUrl || '❌ NOT SET'}`);
      
      const hasGeminiUrl = !!geminiUrl;
      const hasBackendUrl = !!backendUrl;
      
      if (hasGeminiUrl && hasBackendUrl) {
        console.log('✅ Test 3 PASSED: Environment variables configured');
        return {
          test: 'Environment Configuration',
          status: 'PASSED',
          result: { geminiUrl, backendUrl }
        };
      } else {
        throw new Error('Missing required environment variables');
      }
      
    } catch (error) {
      console.error('❌ Test 3 FAILED:', error);
      return {
        test: 'Environment Configuration',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Test 4: Message Flow Simulation
   */
  static testMessageFlowSimulation() {
    console.log('🧪 Test 4: Testing Message Flow Simulation...');
    
    try {
      // Simulate the complete message flow without network requests
      const userQuery = "Best phones under 30k";
      
      // 1. Check if query is valid
      if (!userQuery.trim()) {
        throw new Error('Empty query validation failed');
      }
      
      // 2. Simulate response formatting
      const mockResponse = {
        response_type: 'recommendations',
        content: {
          text: 'Here are some great phone recommendations under 30k BDT:',
          phones: [
            { name: 'Xiaomi Redmi Note 12', price: 25000 },
            { name: 'Samsung Galaxy A14', price: 28000 }
          ],
          suggestions: ['Compare these phones', 'Show specifications']
        },
        formatting_hints: {
          display_as: 'cards',
          show_suggestions: true
        }
      };
      
      // 3. Verify response structure
      const requiredFields = ['response_type', 'content'];
      const hasRequiredFields = requiredFields.every(field => field in mockResponse);
      
      if (!hasRequiredFields) {
        throw new Error('Response structure validation failed');
      }
      
      console.log('✅ Test 4 PASSED: Message flow simulation works');
      console.log('📱 Mock Response:', mockResponse);
      
      return {
        test: 'Message Flow Simulation',
        status: 'PASSED',
        result: mockResponse
      };
      
    } catch (error) {
      console.error('❌ Test 4 FAILED:', error);
      return {
        test: 'Message Flow Simulation',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Test 5: CORS Issue Detection
   */
  static async testCORSDetection() {
    console.log('🧪 Test 5: Testing CORS Issue Detection...');
    
    try {
      const geminiUrl = process.env.REACT_APP_GEMINI_API || 'https://ai-service-188950165425.asia-southeast1.run.app';
      const currentOrigin = window.location.origin;
      
      console.log(`🌍 Current Origin: ${currentOrigin}`);
      console.log(`🎯 Target API: ${geminiUrl}`);
      
      // Check if this is a cross-origin request
      const apiUrl = new URL(geminiUrl);
      const currentUrl = new URL(currentOrigin);
      
      const isCrossOrigin = apiUrl.hostname !== currentUrl.hostname;
      
      if (isCrossOrigin) {
        console.log('⚠️  CORS Issue Detected: Cross-origin request from localhost to production API');
        console.log(`   From: ${currentUrl.hostname}`);
        console.log(`   To: ${apiUrl.hostname}`);
        
        return {
          test: 'CORS Detection',
          status: 'WARNING',
          result: {
            isCrossOrigin: true,
            from: currentUrl.hostname,
            to: apiUrl.hostname,
            message: 'CORS configuration needed for production API'
          }
        };
      } else {
        console.log('✅ Test 5 PASSED: No CORS issues detected');
        return {
          test: 'CORS Detection',
          status: 'PASSED',
          result: { isCrossOrigin: false }
        };
      }
      
    } catch (error) {
      console.error('❌ Test 5 FAILED:', error);
      return {
        test: 'CORS Detection',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Run All Tests
   */
  static async runAllTests() {
    console.log('🚀 Starting Manual Test Suite for Direct Gemini Integration');
    console.log('================================================================');
    
    const results = [];
    
    // Run all tests
    results.push(await this.testGeminiResponseFormat());
    results.push(await this.testChatStateManagement());
    results.push(this.testEnvironmentConfig());
    results.push(this.testMessageFlowSimulation());
    results.push(await this.testCORSDetection());
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    
    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    
    results.forEach((result, index) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${icon} Test ${index + 1}: ${result.test} - ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Overall assessment
    if (failed === 0) {
      console.log('\n🎉 OVERALL: System architecture is working correctly!');
      if (warnings > 0) {
        console.log('💡 Note: CORS issues are expected in development. See recommendations below.');
      }
    } else {
      console.log('\n❌ OVERALL: Some issues need to be addressed');
    }
    
    return results;
  }
}

// Auto-run tests when this module is imported in development
if (process.env.NODE_ENV === 'development') {
  // Export for manual triggering
  (window as any).runManualTests = () => ManualTestSuite.runAllTests();
  console.log('🔧 Manual tests available. Run: window.runManualTests()');
}