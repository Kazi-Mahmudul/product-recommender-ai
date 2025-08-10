import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Phone } from '../../api/phones';

interface ChartMetric {
  key: string;
  label: string;
  getValue: (phone: Phone) => number;
  maxValue: number;
  color: string;
  unit?: string;
}

interface MetricChartProps {
  phones: Phone[];
  chartType?: 'bar';
}

const MetricChart: React.FC<MetricChartProps> = ({
  phones,
  chartType = 'bar'
}) => {
  // Define metrics for the chart
  const metrics: ChartMetric[] = [
    {
      key: 'price',
      label: 'Price (Inverted)',
      getValue: (phone) => {
        const price = phone.price_original || 0;
        // Invert price so lower price = higher score (better)
        return price > 0 ? Math.max(0, 100 - (price / 1000)) : 0;
      },
      maxValue: 100,
      color: '#ef4444',
      unit: 'score'
    },
    {
      key: 'ram',
      label: 'RAM',
      getValue: (phone) => phone.ram_gb || 0,
      maxValue: 16,
      color: '#3b82f6',
      unit: 'GB'
    },
    {
      key: 'storage',
      label: 'Storage',
      getValue: (phone) => (phone.storage_gb || 0) / 10, // Scale down for better visualization
      maxValue: 51.2, // 512GB / 10
      color: '#8b5cf6',
      unit: '×10 GB'
    },
    {
      key: 'camera',
      label: 'Camera',
      getValue: (phone) => phone.camera_score || 0,
      maxValue: 10,
      color: '#10b981',
      unit: '/10'
    },
    {
      key: 'battery',
      label: 'Battery',
      getValue: (phone) => phone.battery_score || 0,
      maxValue: 10,
      color: '#f59e0b',
      unit: '/10'
    },
    {
      key: 'display',
      label: 'Display',
      getValue: (phone) => phone.display_score || 0,
      maxValue: 10,
      color: '#06b6d4',
      unit: '/10'
    }
  ];

  // Prepare data for the chart
  const chartData = phones.map((phone, index) => {
    const dataPoint: any = {
      name: phone.brand + ' ' + phone.name.split(' ').slice(0, 2).join(' '), // Shortened name
      fullName: phone.name,
      phoneId: phone.id
    };

    metrics.forEach(metric => {
      dataPoint[metric.key] = metric.getValue(phone);
    });

    return dataPoint;
  });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {data.fullName}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              const metric = metrics.find(m => m.key === entry.dataKey);
              const originalValue = getOriginalValue(data.phoneId, entry.dataKey);
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {metric?.label}:
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white ml-2">
                    {originalValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get original value for tooltip display
  const getOriginalValue = (phoneId: number, metricKey: string) => {
    const phone = phones.find(p => p.id === phoneId);
    if (!phone) return 'N/A';

    switch (metricKey) {
      case 'price':
        return phone.price_original ? `Tk. ${phone.price_original.toLocaleString()}` : 'N/A';
      case 'ram':
        return phone.ram_gb ? `${phone.ram_gb} GB` : 'N/A';
      case 'storage':
        return phone.storage_gb ? `${phone.storage_gb} GB` : 'N/A';
      case 'camera':
        return phone.camera_score ? `${phone.camera_score.toFixed(1)}/100` : 'N/A';
      case 'battery':
        return phone.battery_score ? `${phone.battery_score.toFixed(1)}/100` : 'N/A';
      case 'display':
        return phone.display_score ? `${phone.display_score.toFixed(1)}/100` : 'N/A';
      default:
        return 'N/A';
    }
  };

  if (phones.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance Metrics
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No phones to compare
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Performance Metrics
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Visual comparison of key performance indicators
        </p>
      </div>

      <div className="p-6">
        {/* Mobile-friendly chart container with horizontal scroll */}
        <div className="overflow-x-auto">
          <div 
            className="h-96" 
            style={{ minWidth: `${Math.max(600, phones.length * 120)}px` }}
            role="img" 
            aria-label="Phone performance metrics comparison chart"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                
                {metrics.map((metric, index) => (
                  <Bar
                    key={metric.key}
                    dataKey={metric.key}
                    name={metric.label}
                    fill={metric.color}
                    radius={[2, 2, 0, 0]}
                    opacity={0.8}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        <div className="block sm:hidden mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ← Scroll horizontally to view all data →
          </p>
        </div>

        {/* Chart Legend/Notes */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Chart Notes:
          </h3>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Price is inverted (lower price = higher score)</li>
            <li>• Storage values are scaled down by 10x for better visualization</li>
            <li>• Scores are normalized for fair comparison</li>
            <li>• Hover over bars for exact values</li>
          </ul>
        </div>

        {/* Screen reader description */}
        <div className="sr-only" aria-live="polite">
          <h4>Chart Data Summary:</h4>
          {chartData.map((data, index) => (
            <div key={index}>
              <p>{data.fullName} performance metrics:</p>
              <ul>
                {metrics.map(metric => (
                  <li key={metric.key}>
                    {metric.label}: {getOriginalValue(data.phoneId, metric.key)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricChart;