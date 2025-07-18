/**
 * Badge selection utility for phone recommendations
 * Selects the most relevant badge for a phone based on its features and recommendation data
 */

import { Phone } from '../api/phones';

// Badge types and their priorities
export enum BadgeType {
  VALUE = 'value',
  FEATURE = 'feature',
  STATUS = 'status'
}

export interface Badge {
  type: BadgeType;
  label: string;
  priority: number;
  icon?: string; // Optional icon identifier
}

export interface BadgeSelectionProps {
  phone: Phone;
  score?: number;
  matchReason?: string;
  highlights?: string[];
  badges?: string[];
}

// Badge definitions with priorities (higher number = higher priority)
const BADGE_DEFINITIONS: Record<string, Badge> = {
  'best_value': {
    type: BadgeType.VALUE,
    label: 'Best Value',
    priority: 100,
    icon: 'award'
  },
  'battery_king': {
    type: BadgeType.FEATURE,
    label: 'Battery King',
    priority: 90,
    icon: 'battery'
  },
  'top_camera': {
    type: BadgeType.FEATURE,
    label: 'Top Camera',
    priority: 85,
    icon: 'camera'
  },
  'new_launch': {
    type: BadgeType.STATUS,
    label: 'New Launch',
    priority: 80,
    icon: 'star'
  },
  'popular': {
    type: BadgeType.STATUS,
    label: 'Popular',
    priority: 75,
    icon: 'trending-up'
  },
  'performance_beast': {
    type: BadgeType.FEATURE,
    label: 'Performance Beast',
    priority: 70,
    icon: 'zap'
  },
  'display_master': {
    type: BadgeType.FEATURE,
    label: 'Display Master',
    priority: 65,
    icon: 'monitor'
  }
};

/**
 * Normalizes a badge string to a key that can be used in BADGE_DEFINITIONS
 * @param badge The badge string to normalize
 * @returns Normalized badge key
 */
function normalizeBadgeKey(badge: string): string {
  return badge
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with a single one
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Determines if a phone has a specific feature based on its specifications
 * @param phone The phone object
 * @param featureType The type of feature to check
 * @returns Boolean indicating if the phone has the feature
 */
function hasFeature(phone: Phone, featureType: string): boolean {
  switch (featureType) {
    case 'battery_king':
      return !!(
        (phone.battery_capacity_numeric && phone.battery_capacity_numeric >= 5000) ||
        (phone.battery_score && phone.battery_score >= 8.0) ||
        phone.has_fast_charging === true
      );
    case 'top_camera':
      return !!(
        (phone.primary_camera_mp && phone.primary_camera_mp >= 50) ||
        (phone.camera_score && phone.camera_score >= 8.0) ||
        (phone.camera_count && phone.camera_count >= 3)
      );
    case 'performance_beast':
      return !!(
        (phone.performance_score && phone.performance_score >= 8.0) ||
        (phone.ram_gb && phone.ram_gb >= 8)
      );
    case 'display_master':
      return !!(
        (phone.display_score && phone.display_score >= 8.0) ||
        (phone.refresh_rate_numeric && phone.refresh_rate_numeric >= 120) ||
        (phone.screen_size_numeric && phone.screen_size_numeric >= 6.5)
      );
    case 'new_launch':
      return phone.is_new_release === true;
    case 'popular':
      return phone.is_popular_brand === true;
    default:
      return false;
  }
}

/**
 * Infers badges from phone specifications when no badges are provided
 * @param phone The phone object
 * @returns Array of inferred badge keys
 */
function inferBadgesFromSpecs(phone: Phone): string[] {
  const inferredBadges: string[] = [];

  // Check for value proposition
  if (
    (phone.price_original && phone.overall_device_score && 
     phone.overall_device_score / (phone.price_original / 10000) > 2.0) ||
    phone.price_category === 'budget' || 
    phone.price_category === 'mid-range'
  ) {
    inferredBadges.push('best_value');
  }

  // Check for feature-specific badges
  if (hasFeature(phone, 'battery_king')) inferredBadges.push('battery_king');
  if (hasFeature(phone, 'top_camera')) inferredBadges.push('top_camera');
  if (hasFeature(phone, 'performance_beast')) inferredBadges.push('performance_beast');
  if (hasFeature(phone, 'display_master')) inferredBadges.push('display_master');
  
  // Check for status badges
  if (hasFeature(phone, 'new_launch')) inferredBadges.push('new_launch');
  if (hasFeature(phone, 'popular')) inferredBadges.push('popular');

  return inferredBadges;
}

/**
 * Selects the most relevant badge for a phone
 * @param props The badge selection props
 * @returns The selected badge or null if no badge is applicable
 */
export function selectPrimaryBadge(props: BadgeSelectionProps): Badge | null {
  const { phone, badges = [] } = props;
  
  // Combine provided badges with inferred badges
  const allBadges = [...badges];
  
  // If no badges provided, infer from specs
  if (allBadges.length === 0) {
    allBadges.push(...inferBadgesFromSpecs(phone));
  }
  
  if (allBadges.length === 0) {
    return null;
  }
  
  // Find the highest priority badge
  let highestPriorityBadge: Badge | null = null;
  let highestPriority = -1;
  
  for (const badgeStr of allBadges) {
    const normalizedKey = normalizeBadgeKey(badgeStr);
    const badgeDef = BADGE_DEFINITIONS[normalizedKey];
    
    // If badge definition exists and has higher priority than current highest
    if (badgeDef && badgeDef.priority > highestPriority) {
      highestPriorityBadge = badgeDef;
      highestPriority = badgeDef.priority;
    }
  }
  
  return highestPriorityBadge;
}

/**
 * Gets a badge by its key
 * @param key The badge key
 * @returns The badge definition or null if not found
 */
export function getBadgeByKey(key: string): Badge | null {
  const normalizedKey = normalizeBadgeKey(key);
  return BADGE_DEFINITIONS[normalizedKey] || null;
}