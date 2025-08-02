#!/usr/bin/env node

/**
 * Metrics Export Script
 * 
 * Exports metrics data for analysis and reporting.
 */

const fs = require('fs');
const path = require('path');

async function exportMetrics() {
  console.log('📊 Exporting metrics...\n');
  
  try {
    const format = process.argv[2] || 'json';
    const outputPath = process.argv[3] || `./exports/metrics-${Date.now()}.${format}`;
    
    // Ensure exports directory exists
    const exportsDir = path.dirname(outputPath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Mock metrics data (in a real implementation, this would come from the MetricsCollector)
    const metricsData = {
      exportTime: new Date().toISOString(),
      summary: {
        totalRequests: 1250,
        successfulRequests: 1180,
        failedRequests: 70,
        successRate: 0.944,
        averageResponseTime: 1250,
        fallbackUsage: 45
      },
      providers: {
        gemini: {
          requests: 1205,
          successes: 1150,
          failures: 55,
          successRate: 0.954,
          averageResponseTime: 1200
        },
        local_fallback: {
          requests: 45,
          successes: 30,
          failures: 15,
          successRate: 0.667,
          averageResponseTime: 150
        }
      },
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };
    
    let exportContent;
    
    switch (format.toLowerCase()) {
      case 'json':
        exportContent = JSON.stringify(metricsData, null, 2);
        break;
        
      case 'csv':
        // Simple CSV export
        const csvLines = [
          'timestamp,provider,requests,successes,failures,success_rate,avg_response_time',
          `${metricsData.exportTime},gemini,${metricsData.providers.gemini.requests},${metricsData.providers.gemini.successes},${metricsData.providers.gemini.failures},${metricsData.providers.gemini.successRate},${metricsData.providers.gemini.averageResponseTime}`,
          `${metricsData.exportTime},local_fallback,${metricsData.providers.local_fallback.requests},${metricsData.providers.local_fallback.successes},${metricsData.providers.local_fallback.failures},${metricsData.providers.local_fallback.successRate},${metricsData.providers.local_fallback.averageResponseTime}`
        ];
        exportContent = csvLines.join('\n');
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}. Use 'json' or 'csv'.`);
    }
    
    // Write to file
    fs.writeFileSync(outputPath, exportContent);
    
    console.log(`✅ Metrics exported successfully!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Format: ${format.toUpperCase()}`);
    console.log(`📈 Total Requests: ${metricsData.summary.totalRequests}`);
    console.log(`✅ Success Rate: ${Math.round(metricsData.summary.successRate * 100)}%`);
    console.log(`⏱️  Average Response Time: ${metricsData.summary.averageResponseTime}ms`);
    console.log(`🔄 Fallback Usage: ${metricsData.summary.fallbackUsage} requests\n`);
    
  } catch (error) {
    console.error('💥 Metrics export error:', error.message);
    console.log('\nUsage: npm run export-metrics [format] [output-path]');
    console.log('  format: json or csv (default: json)');
    console.log('  output-path: where to save the file (default: ./exports/metrics-[timestamp].[format])');
    console.log('\nExamples:');
    console.log('  npm run export-metrics');
    console.log('  npm run export-metrics csv');
    console.log('  npm run export-metrics json ./reports/metrics.json\n');
    process.exit(1);
  }
}

// Run export if called directly
if (require.main === module) {
  exportMetrics();
}

module.exports = exportMetrics;