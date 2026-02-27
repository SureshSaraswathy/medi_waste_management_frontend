/**
 * Chart Widget Component
 * 
 * Displays various chart types (line, bar, pie, area, donut) based on configuration.
 * Supports dynamic data loading from API endpoints.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ChartType } from '../../../types/dashboard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import './widgets.css';

interface ChartWidgetProps {
  title: string;
  type: ChartType;
  data?: any[] | { labels?: string[]; data?: number[] };
  loading?: boolean;
  xAxis?: string;
  yAxis?: string;
  series?: string[];
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  title,
  type,
  data = [],
  loading = false,
  xAxis,
  yAxis,
  series,
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);

  const resolvedXAxis = xAxis || 'label';
  const resolvedYAxis = yAxis || 'value';

  useEffect(() => {
    // Handle different data formats from backend
    if (Array.isArray(data)) {
      setChartData(data);
      setChartLabels(data.map((item, index) => item.label || item[resolvedXAxis] || `Item ${index + 1}`));
    } else if (data && typeof data === 'object' && 'labels' in data && 'data' in data) {
      // Backend format: { labels: [...], data: [...] }
      setChartLabels(data.labels || []);
      setChartData((data.data || []).map((value: number, index: number) => ({
        label: data.labels?.[index] || `Item ${index + 1}`,
        value,
      })));
    } else {
      setChartData([]);
      setChartLabels([]);
    }
  }, [data, resolvedXAxis]);

  const seriesKeys = useMemo(() => {
    // If caller provided explicit series keys, respect it.
    if (Array.isArray(series) && series.length > 0) return series;

    // Default to a single-series `value` (matches widgetDataService output).
    return [resolvedYAxis];
  }, [resolvedYAxis, series]);

  const pieColors = useMemo(
    () => ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'],
    []
  );

  if (loading) {
    return (
      <div className="widget-panel widget-panel--chart">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            <div className="skeleton-chart"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-panel widget-panel--chart">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
      </div>
      <div className="widget-panel__body">
        {chartData.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="21" x2="21" y2="21"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <polyline points="5 21 5 10 9 10 9 21"></polyline>
              <polyline points="13 21 13 10 17 10 17 21"></polyline>
            </svg>
            <p>No data available</p>
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              {type === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={resolvedXAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {seriesKeys.map((key) => (
                    <Line key={key} type="monotone" dataKey={key} stroke="#2563eb" strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              ) : type === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={resolvedXAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {seriesKeys.map((key) => (
                    <Bar key={key} dataKey={key} fill="#2563eb" radius={[6, 6, 0, 0]} />
                  ))}
                </BarChart>
              ) : type === 'pie' || type === 'doughnut' ? (
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={chartData}
                    dataKey={resolvedYAxis}
                    nameKey={resolvedXAxis}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={type === 'doughnut' ? 55 : 0}
                    paddingAngle={2}
                  >
                    {chartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                // Fallback: default to line chart
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={resolvedXAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {seriesKeys.map((key) => (
                    <Line key={key} type="monotone" dataKey={key} stroke="#2563eb" strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartWidget;
