// Service for generating contextual explanations for phone recommendations

import { Phone } from '../api/phones';

export class RecommendationExplainer {
  /**
   * Generate explanation for why specific phones were recommended
   */
  static generateExplanation(phones: Phone[], originalQuery: string): string {
    if (!phones || phones.length === 0) {
      return "No phones found matching your criteria.";
    }

    const queryLower = originalQuery.toLowerCase();
    const explanationParts: string[] = [];

    // Analyze query intent
    const intent = this.analyzeQueryIntent(queryLower);
    
    // Generate explanation based on intent and phone characteristics
    switch (intent) {
      case 'budget':
        explanationParts.push(this.generateBudgetExplanation(phones, queryLower));
        break;
      case 'premium':
        explanationParts.push(this.generatePremiumExplanation(phones));
        break;
      case 'gaming':
        explanationParts.push(this.generateGamingExplanation(phones));
        break;
      case 'camera':
        explanationParts.push(this.generateCameraExplanation(phones));
        break;
      case 'battery':
        explanationParts.push(this.generateBatteryExplanation(phones));
        break;
      default:
        explanationParts.push(this.generateGeneralExplanation(phones, queryLower));
    }

    // Add specific feature highlights
    const highlights = this.generateFeatureHighlights(phones);
    if (highlights) {
      explanationParts.push(highlights);
    }

    return explanationParts.join(' ');
  }

  /**
   * Analyze query to determine user intent
   */
  private static analyzeQueryIntent(query: string): string {
    if (query.includes('budget') || query.includes('cheap') || query.includes('under')) {
      return 'budget';
    }
    if (query.includes('premium') || query.includes('flagship') || query.includes('best')) {
      return 'premium';
    }
    if (query.includes('gaming') || query.includes('performance')) {
      return 'gaming';
    }
    if (query.includes('camera') || query.includes('photo')) {
      return 'camera';
    }
    if (query.includes('battery') || query.includes('charging')) {
      return 'battery';
    }
    return 'general';
  }

  /**
   * Generate budget-focused explanation
   */
  private static generateBudgetExplanation(phones: Phone[], query: string): string {
    const priceMatch = query.match(/under\s+([0-9,]+)/);
    const budget = priceMatch ? priceMatch[1].replace(',', '') : 'your budget';
    
    const avgPrice = phones.reduce((sum, p) => sum + (p.price_original || 0), 0) / phones.length;
    
    return `These phones offer excellent value under ${budget} taka, with an average price of ৳${Math.round(avgPrice).toLocaleString()}.`;
  }

  /**
   * Generate premium-focused explanation
   */
  private static generatePremiumExplanation(phones: Phone[]): string {
    const highScorePhones = phones.filter(p => p.overall_device_score && p.overall_device_score >= 8);
    
    if (highScorePhones.length > 0) {
      return `These premium phones feature top-tier specifications and high overall scores (${highScorePhones.length} with 8+ ratings).`;
    }
    
    return "These phones represent the best premium options available with flagship features.";
  }

  /**
   * Generate gaming-focused explanation
   */
  private static generateGamingExplanation(phones: Phone[]): string {
    const highRefreshPhones = phones.filter(p => p.refresh_rate_numeric && p.refresh_rate_numeric >= 90);
    const goodPerformancePhones = phones.filter(p => p.performance_score && p.performance_score >= 7);
    
    const features: string[] = [];
    if (highRefreshPhones.length > 0) {
      features.push(`${highRefreshPhones.length} with high refresh rate displays`);
    }
    if (goodPerformancePhones.length > 0) {
      features.push(`${goodPerformancePhones.length} with strong performance scores`);
    }
    
    return `These phones are optimized for gaming${features.length > 0 ? ` (${features.join(', ')})` : ''}.`;
  }

  /**
   * Generate camera-focused explanation
   */
  private static generateCameraExplanation(phones: Phone[]): string {
    const highCameraPhones = phones.filter(p => p.camera_score && p.camera_score >= 8);
    const highMpPhones = phones.filter(p => p.primary_camera_mp && p.primary_camera_mp >= 48);
    
    const features: string[] = [];
    if (highCameraPhones.length > 0) {
      features.push(`${highCameraPhones.length} with excellent camera scores`);
    }
    if (highMpPhones.length > 0) {
      features.push(`${highMpPhones.length} with 48MP+ main cameras`);
    }
    
    return `These phones excel in photography${features.length > 0 ? ` (${features.join(', ')})` : ''}.`;
  }

  /**
   * Generate battery-focused explanation
   */
  private static generateBatteryExplanation(phones: Phone[]): string {
    const largeBatteryPhones = phones.filter(p => p.battery_capacity_numeric && p.battery_capacity_numeric >= 4500);
    const fastChargingPhones = phones.filter(p => p.has_fast_charging);
    
    const features: string[] = [];
    if (largeBatteryPhones.length > 0) {
      features.push(`${largeBatteryPhones.length} with 4500mAh+ batteries`);
    }
    if (fastChargingPhones.length > 0) {
      features.push(`${fastChargingPhones.length} with fast charging`);
    }
    
    return `These phones offer excellent battery life${features.length > 0 ? ` (${features.join(', ')})` : ''}.`;
  }

  /**
   * Generate general explanation
   */
  private static generateGeneralExplanation(phones: Phone[], query: string): string {
    const brands = Array.from(new Set(phones.map(p => p.brand).filter(Boolean)));
    const avgScore = phones.reduce((sum, p) => sum + (p.overall_device_score || 0), 0) / phones.length;
    
    let explanation = `These ${phones.length} phones`;
    
    if (brands.length === 1) {
      explanation += ` from ${brands[0]}`;
    } else if (brands.length > 1) {
      explanation += ` from ${brands.slice(0, 2).join(' and ')}${brands.length > 2 ? ' and others' : ''}`;
    }
    
    if (avgScore > 0) {
      explanation += ` have an average rating of ${avgScore.toFixed(1)}/10`;
    }
    
    explanation += " and match your search criteria well.";
    
    return explanation;
  }

  /**
   * Generate feature highlights
   */
  private static generateFeatureHighlights(phones: Phone[]): string {
    const highlights: string[] = [];
    
    // Check for 5G support
    const fiveGPhones = phones.filter(p => p.network && p.network.toLowerCase().includes('5g'));
    if (fiveGPhones.length === phones.length) {
      highlights.push("All support 5G connectivity");
    } else if (fiveGPhones.length > 0) {
      highlights.push(`${fiveGPhones.length} support 5G`);
    }
    
    // Check for wireless charging
    const wirelessChargingPhones = phones.filter(p => p.has_wireless_charging);
    if (wirelessChargingPhones.length > 0) {
      highlights.push(`${wirelessChargingPhones.length} have wireless charging`);
    }
    
    // Check for high refresh rate
    const highRefreshPhones = phones.filter(p => p.refresh_rate_numeric && p.refresh_rate_numeric >= 120);
    if (highRefreshPhones.length > 0) {
      highlights.push(`${highRefreshPhones.length} have 120Hz+ displays`);
    }
    
    if (highlights.length > 0) {
      return `Key features: ${highlights.join(', ')}.`;
    }
    
    return '';
  }

  /**
   * Generate short summary for top recommendation
   */
  static generateTopRecommendationSummary(phone: Phone, originalQuery: string): string {
    const queryLower = originalQuery.toLowerCase();
    const reasons: string[] = [];
    
    // Price-based reasoning
    if (queryLower.includes('budget') || queryLower.includes('under')) {
      if (phone.price_original && phone.price_original < 30000) {
        reasons.push('excellent value for money');
      }
    }
    
    // Feature-based reasoning
    if (phone.overall_device_score && phone.overall_device_score >= 8) {
      reasons.push('high overall rating');
    }
    
    if (phone.camera_score && phone.camera_score >= 8) {
      reasons.push('excellent camera quality');
    }
    
    if (phone.battery_capacity_numeric && phone.battery_capacity_numeric >= 4500) {
      reasons.push('long battery life');
    }
    
    if (phone.refresh_rate_numeric && phone.refresh_rate_numeric >= 90) {
      reasons.push('smooth display');
    }
    
    if (reasons.length > 0) {
      return `Top pick for ${reasons.slice(0, 2).join(' and ')}.`;
    }
    
    return 'Highly recommended based on your criteria.';
  }
}