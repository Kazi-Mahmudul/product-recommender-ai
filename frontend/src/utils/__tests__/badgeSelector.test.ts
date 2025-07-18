import { selectPrimaryBadge, getBadgeByKey, BadgeType } from '../badgeSelector';
import { Phone } from '../../api/phones';

describe('Badge Selector Utility', () => {
  // Mock phone data for testing
  const mockPhone: Phone = {
    id: 1,
    name: 'Test Phone',
    brand: 'Test Brand',
    model: 'Test Model',
    price: '₹45,000',
    url: 'https://example.com',
    price_original: 45000,
    ram_gb: 8,
    storage_gb: 128,
    battery_capacity_numeric: 5000,
    primary_camera_mp: 64,
    selfie_camera_mp: 16,
    overall_device_score: 8.5,
    camera_score: 8.2,
    battery_score: 9.0,
    performance_score: 8.0,
    display_score: 7.5,
    is_new_release: true,
    is_popular_brand: true
  };

  describe('selectPrimaryBadge', () => {
    it('should select the highest priority badge from provided badges', () => {
      const result = selectPrimaryBadge({
        phone: mockPhone,
        badges: ['Battery King', 'Top Camera', 'Best Value']
      });
      
      expect(result).not.toBeNull();
      expect(result?.label).toBe('Best Value');
      expect(result?.type).toBe(BadgeType.VALUE);
    });

    it('should infer badges from phone specs when no badges are provided', () => {
      const result = selectPrimaryBadge({
        phone: mockPhone
      });
      
      expect(result).not.toBeNull();
      // Since the mock phone has is_new_release and high battery score,
      // we expect one of these badges to be selected based on priority
      expect(['Best Value', 'Battery King', 'New Launch'].includes(result?.label || '')).toBeTruthy();
    });

    it('should return null when no badges are applicable', () => {
      const emptyPhone: Phone = {
        id: 2,
        name: 'Empty Phone',
        brand: 'Empty Brand',
        model: 'Empty Model',
        price: '₹10,000',
        url: 'https://example.com'
      };
      
      // Override the inferBadgesFromSpecs function for this test
      jest.spyOn(Object.getPrototypeOf(require('../badgeSelector')), 'inferBadgesFromSpecs')
        .mockImplementationOnce(() => []);
      
      const result = selectPrimaryBadge({
        phone: emptyPhone
      });
      
      expect(result).toBeNull();
    });
  });

  describe('getBadgeByKey', () => {
    it('should return the correct badge definition for a valid key', () => {
      const result = getBadgeByKey('best_value');
      
      expect(result).not.toBeNull();
      expect(result?.label).toBe('Best Value');
      expect(result?.type).toBe(BadgeType.VALUE);
    });

    it('should normalize badge keys', () => {
      const result = getBadgeByKey('Best Value');
      
      expect(result).not.toBeNull();
      expect(result?.label).toBe('Best Value');
    });

    it('should return null for unknown badge keys', () => {
      const result = getBadgeByKey('unknown_badge');
      
      expect(result).toBeNull();
    });
  });
});