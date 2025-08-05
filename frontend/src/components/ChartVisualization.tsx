import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Phone } from '../api/phones';
import { ArrowLeft, BarChart3, TrendingUp, Target } from 'lucide-react';
import { useMobileResponsive, useSwipeGesture } from '../hooks/useMobileResponsive';
import { MobileUtils } from '../utils/mobileUtils';

interface ChartVisualizationProps {
  phones: Phone[];
  darkMode: boolean;
  onBackToSimple?: () => void;
}

type ChartType = 'bar' | 'line' | 'radar';

interface ChartMetric {
  key: keyof Phone;
  label: string;
  unit?: string;
  color: string;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  phones,
  darkMode,
  onBackToSimple
}) => {
  const { isMobile, isTablet } = useMobileResponsive();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'overall_device_score',
    'camera_score',
    'battery_score',
    'performance_score'
  ]);

  // Swipe gesture support for mobile chart type switching
  const swipeGestures = useSwipeGesture(
    () => {
      // Swipe left - next chart type
      const types: ChartType[] = ['bar', 'line', 'radar'];
      const currentIndex = types.indexOf(chartType);
      const nextIndex = (currentIndex + 1) % types.length;
      setChartType(types[nextIndex]);
      MobileUtils.addHapticFeedback('light');
    },
    () => {
      // Swipe right - previous chart type
      const types: ChartType[] = ['bar', 'line', 'radar'];
      const currentIndex = types.indexOf(chartType);
      const prevIndex = currentIndex === 0 ? types.length - 1 : currentIndex - 1;
      setChartType(types[prevIndex]);
      MobileUtils.addHapticFeedback('light');
    }
  );

  const availableMetrics: ChartMetric[] = [
    { key: 'overall_device_score', label: 'Overall Score', unit: '/10', color: '#8884d8' },
    { key: 'camera_score', label: 'Camera Score', unit: '/10', color: '#82ca9d' },
    { key: 'battery_score', label: 'Battery Score', unit: '/10', color: '#ffc658' },
    { key: 'performance_score', label: 'Performance Score', unit: '/10', color: '#ff7300' },
    { key: 'display_score', label: 'Display Score', unit: '/10', color: '#00ff88' },
    { key: 'security_score', label: 'Security Score', unit: '/10', color: '#ff0088' },
    { key: 'connectivity_score', label: 'Connectivity Score', unit: '/10', color: '#8800ff' },
    { key: 'price_original', label: 'Price', unit: 'BDT', color: '#ff4444' },
    { key: 'ram_gb', label: 'RAM', unit: 'GB', color: '#44ff44' },
    { key: 'storage_gb', label: 'Storage', unit: 'GB', color: '#4444ff' },
    { key: 'primary_camera_mp', label: 'Main Camera', unit: 'MP', color: '#ffaa44' },
    { key: 'battery_capacity_numeric', label: 'Battery Capacity', unit: 'mAh', color: '#aa44ff' },
    { key: 'refresh_rate_numeric', label: 'Refresh Rate', unit: 'Hz', color: '#44aaff' }
  ];

  const chartData = useMemo(() => {
    return phones.map(phone => {
      const dataPoint: any = {
        name: phone.name,
        brand: phone.brand
      };
      
      availableMetrics.forEach(metric => {
        const value = phone[metric.key];
        if (typeof value === 'number') {
          dataPoint[metric.key] = value;
        } else {
          dataPoint[metric.key] = 0;
        }
      });
      
      return dataPoint;
    });
  }, [phones]);

  const radarData = useMemo(() => {
    const metrics = availableMetrics.filter(m => selectedMetrics.includes(m.key));
    return metrics.map(metric => {
      const dataPoint: any = {
        metric: metric.label,
        fullMark: metric.key === 'price_original' ? Math.max(...phones.map(p => p[metric.key] as number || 0)) : 10
      };
      
      phones.forEach((phone, index) => {
        const value = phone[metric.key] as number || 0;
        dataPoint[`phone${index}`] = value;
        dataPoint[`phoneName${index}`] = phone.name;
      });
      
      return dataPoint;
    });
  }, [phones, selectedMetrics]);

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        return prev.filter(key => key !== metricKey);
      } else {
        return [...prev, metricKey];
      }
    });
  };

  const getChartIcon = (type: ChartType) => {
    switch (type) {
      case 'bar':
        return <BarChart3 size={16} />;
      case 'line':
        return <TrendingUp size={16} />;
      case 'radar':
        return <Target size={16} />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const metric = availableMetrics.find(m => m.key === entry.dataKey);
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {metric?.label}: {entry.value}{metric?.unit || ''}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderBarChart = () => {
    const chartDimensions = MobileUtils.getChartDimensions();
    return (
      <ResponsiveContainer width="100%" height={chartDimensions.height}>
        <BarChart data={chartData} margin={chartDimensions.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: isMobile ? 10 : 12, fill: darkMode ? '#d1d5db' : '#374151' }}
            angle={isMobile ? -45 : -30}
            textAnchor="end"
            height={isMobile ? 100 : 80}
            interval={0}
          />
          <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: darkMode ? '#d1d5db' : '#374151' }} />
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && <Legend />}
          {selectedMetrics.map(metricKey => {
            const metric = availableMetrics.find(m => m.key === metricKey);
            if (!metric) return null;
            return (
              <Bar
                key={metricKey}
                dataKey={metricKey}
                fill={metric.color}
                name={metric.label}
                radius={[2, 2, 0, 0]}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderLineChart = () => {
    const chartDimensions = MobileUtils.getChartDimensions();
    return (
      <ResponsiveContainer width="100%" height={chartDimensions.height}>
        <LineChart data={chartData} margin={chartDimensions.margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: isMobile ? 10 : 12, fill: darkMode ? '#d1d5db' : '#374151' }}
            angle={isMobile ? -45 : -30}
            textAnchor="end"
            height={isMobile ? 100 : 80}
            interval={0}
          />
          <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: darkMode ? '#d1d5db' : '#374151' }} />
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && <Legend />}
          {selectedMetrics.map(metricKey => {
            const metric = availableMetrics.find(m => m.key === metricKey);
            if (!metric) return null;
            return (
              <Line
                key={metricKey}
                type="monotone"
                dataKey={metricKey}
                stroke={metric.color}
                strokeWidth={isMobile ? 3 : 2}
                dot={{ r: isMobile ? 6 : 4 }}
                name={metric.label}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderRadarChart = () => {
    const chartDimensions = MobileUtils.getChartDimensions();
    return (
      <ResponsiveContainer width="100%" height={chartDimensions.height}>
        <RadarChart 
          data={radarData} 
          margin={{ 
            top: 20, 
            right: isMobile ? 20 : 80, 
            bottom: 20, 
            left: isMobile ? 20 : 80 
          }}
        >
          <PolarGrid stroke={darkMode ? '#374151' : '#e5e7eb'} />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fontSize: isMobile ? 9 : 11, fill: darkMode ? '#d1d5db' : '#374151' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 'dataMax']}
            tick={{ fontSize: isMobile ? 8 : 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && <Legend />}
          {phones.map((phone, index) => (
            <Radar
              key={index}
              name={phone.name}
              dataKey={`phone${index}`}
              stroke={availableMetrics[index % availableMetrics.length].color}
              fill={availableMetrics[index % availableMetrics.length].color}
              fillOpacity={0.1}
              strokeWidth={isMobile ? 3 : 2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'radar':
        return renderRadarChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className={`max-w-7xl mx-auto p-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBackToSimple && (
            <button
              onClick={onBackToSimple}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Back to simple view"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📊</span>
              Interactive Chart View
            </h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Compare phones across multiple metrics with interactive visualizations
            </p>
          </div>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Chart Type</h3>
          {isMobile && (
            <p className="text-xs text-gray-500">Swipe chart to change type</p>
          )}
        </div>
        <div className={`flex gap-2 ${isMobile ? 'justify-center' : ''}`}>
          {(['bar', 'line', 'radar'] as ChartType[]).map(type => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                minHeight: isMobile ? '44px' : '36px',
                minWidth: isMobile ? '44px' : 'auto'
              }}
              className={`flex items-center gap-2 rounded-lg font-medium transition-colors touch-manipulation ${
                isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-2 text-base'
              } ${
                chartType === type
                  ? 'bg-brand text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getChartIcon(type)}
              {!isMobile && (type.charAt(0).toUpperCase() + type.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Metrics to Display</h3>
        <div className={`grid gap-2 ${
          isMobile 
            ? 'grid-cols-1' 
            : isTablet 
            ? 'grid-cols-2' 
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {availableMetrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              style={{
                minHeight: isMobile ? '44px' : '36px'
              }}
              className={`flex items-center gap-2 rounded-lg font-medium transition-colors touch-manipulation ${
                isMobile ? 'px-4 py-3 text-base justify-start' : 'px-3 py-2 text-sm'
              } ${
                selectedMetrics.includes(metric.key)
                  ? 'bg-brand text-white'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div 
                className={`rounded-full ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`}
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div 
        className={`rounded-lg border ${isMobile ? 'p-2' : 'p-6'} ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
        {...(isMobile ? swipeGestures : {})}
      >
        {selectedMetrics.length === 0 ? (
          <div className="text-center py-12">
            <p className={`${isMobile ? 'text-base' : 'text-lg'} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Select at least one metric to display the chart
            </p>
          </div>
        ) : (
          <div className="relative">
            {renderChart()}
            {isMobile && (
              <div className="absolute top-2 right-2 text-xs text-gray-400">
                Swipe to change chart type
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phone Legend */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Phones</h3>
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : isTablet 
            ? 'grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {phones.map((phone, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 rounded-lg border ${
                isMobile ? 'p-4' : 'p-3'
              } ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <img
                src={phone.img_url || '/phone.png'}
                alt={phone.name}
                className={`object-contain rounded ${
                  isMobile ? 'w-16 h-16' : 'w-12 h-12'
                }`}
              />
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium truncate ${isMobile ? 'text-base' : 'text-sm'}`}>
                  {phone.name}
                </h4>
                <p className={`${isMobile ? 'text-sm' : 'text-xs'} ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } truncate`}>
                  {phone.brand} • ৳{phone.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Interactive chart comparison of {phones.length} phone(s) across {selectedMetrics.length} metric(s)
        </p>
        {onBackToSimple && (
          <button
            onClick={onBackToSimple}
            className="mt-4 px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-darkGreen transition-colors"
          >
            Back to Simple View
          </button>
        )}
      </div>
    </div>
  );
};

export default ChartVisualization;