import React, { useState, useEffect } from 'react';
import { fetchCameraSetups } from '../../api/phones';

interface CameraFiltersProps {
  cameraSetup: string | null;
  mainCamera: number | null;
  frontCamera: number | null;
  onChange: {
    onCameraSetupChange: (setup: string | null) => void;
    onMainCameraChange: (mp: number | null) => void;
    onFrontCameraChange: (mp: number | null) => void;
  };
  cameraSetups: string[];
  mainCameraRange: { min: number; max: number };
  frontCameraRange: { min: number; max: number };
}

const CameraFilters: React.FC<CameraFiltersProps> = ({
  cameraSetup,
  mainCamera,
  frontCamera,
  onChange,
  cameraSetups: propCameraSetups,
  mainCameraRange,
  frontCameraRange
}) => {
  const [cameraSetups, setCameraSetups] = useState<string[]>(propCameraSetups);
  const [loading, setLoading] = useState<boolean>(propCameraSetups.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Fetch camera setups if not provided in props
  useEffect(() => {
    if (propCameraSetups.length === 0) {
      setLoading(true);
      fetchCameraSetups()
        .then(fetchedSetups => {
          setCameraSetups(fetchedSetups);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch camera setups:', err);
          setError('Failed to load camera setups. Please try again later.');
          setLoading(false);
        });
    } else {
      setCameraSetups(propCameraSetups);
    }
  }, [propCameraSetups]);
  // Generate options for camera MP
  const generateMPOptions = (min: number, max: number) => {
    const options = [];
    // Add common MP values
    const mpValues = [5, 8, 12, 16, 20, 32, 48, 50, 64, 108];
    
    for (const value of mpValues) {
      if (value >= min && value <= max) {
        options.push(value);
      }
    }
    
    // Sort and remove duplicates
    return Array.from(new Set(options)).sort((a, b) => a - b);
  };

  const mainCameraOptions = generateMPOptions(mainCameraRange.min, mainCameraRange.max);
  const frontCameraOptions = generateMPOptions(frontCameraRange.min, frontCameraRange.max);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Camera Setup
        </label>
        <select
          value={cameraSetup || ''}
          onChange={(e) => onChange.onCameraSetupChange(e.target.value === '' ? null : e.target.value)}
          disabled={loading}
          className={`w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          <option value="">Any Setup</option>
          {loading ? (
            <option value="" disabled>Loading camera setups...</option>
          ) : cameraSetups.length > 0 ? (
            cameraSetups.map((setup) => (
              <option key={setup} value={setup}>
                {setup}
              </option>
            ))
          ) : (
            <option value="" disabled>No camera setups available</option>
          )}
        </select>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Main Camera (MP)
        </label>
        <select
          value={mainCamera?.toString() || ''}
          onChange={(e) => onChange.onMainCameraChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any MP</option>
          {mainCameraOptions.map((mp) => (
            <option key={mp} value={mp}>
              {mp}MP+
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Front Camera (MP)
        </label>
        <select
          value={frontCamera?.toString() || ''}
          onChange={(e) => onChange.onFrontCameraChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Any MP</option>
          {frontCameraOptions.map((mp) => (
            <option key={mp} value={mp}>
              {mp}MP+
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default CameraFilters;