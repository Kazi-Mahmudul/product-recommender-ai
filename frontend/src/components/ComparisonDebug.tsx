import React from 'react';
import { useComparison } from '../context/ComparisonContext';

const ComparisonDebug: React.FC = () => {
  const { selectedPhones, isLoading, error } = useComparison();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔍 Comparison Debug</h4>
      <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
      <p><strong>Error:</strong> {error || 'None'}</p>
      <p><strong>Selected Phones:</strong> {selectedPhones.length}</p>
      {selectedPhones.map((phone, index) => (
        <div key={phone.slug} style={{ marginLeft: '10px', fontSize: '10px' }}>
          {index + 1}. {phone.brand} {phone.name} ({phone.slug})
        </div>
      ))}
      <button 
        onClick={() => console.log('Current state:', { selectedPhones, isLoading, error })}
        style={{ marginTop: '5px', padding: '2px 5px', fontSize: '10px' }}
      >
        Log State
      </button>
    </div>
  );
};

export default ComparisonDebug;