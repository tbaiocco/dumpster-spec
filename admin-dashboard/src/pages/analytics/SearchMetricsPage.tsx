import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import apiService from '../../services/api.service';

interface LatencyByType {
  type: string;
  avgLatency: number;
  p95: number;
  p99: number;
}

interface SearchMetrics {
  totalSearches: number;
  topQueries: Array<{ query: string; count: number }>;
  queryDistribution: Array<{ type: string; count: number }>;
  averageLatency: number;
  latencyByType: LatencyByType[];
  successRate: number;
  // Legacy fields for backward compatibility
  averageResponseTime?: number;
  searchesByType?: Array<{ type: string; count: number }>;
  popularQueries?: Array<{ query: string; count: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

/**
 * Search Performance Monitoring (T086)
 * Analytics for search functionality - comprehensive metrics display
 */
export const SearchMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const response = await apiService.getSearchMetrics();
    if (response.success && response.data) {
      setMetrics(response.data);
    }
    setLoading(false);
  };

  if (loading || !metrics) {
    return <Spinner size="lg" className="mt-20" />;
  }

  // Normalize data for backward compatibility
  const totalSearches = metrics.totalSearches || 0;
  const averageLatency = metrics.averageLatency || metrics.averageResponseTime || 0;
  const queryDistribution = metrics.queryDistribution || metrics.searchesByType || [];
  const topQueries = metrics.topQueries || metrics.popularQueries || [];
  const successRate = metrics.successRate || 0;
  const latencyByType = metrics.latencyByType || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Search Performance</h1>
          </div>
          <button
            onClick={loadMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p className="text-gray-600 ml-14">Comprehensive analytics for search functionality</p>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700">Total Searches</CardDescription>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <CardTitle className="text-4xl text-blue-900">{totalSearches.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700">Success Rate</CardDescription>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-4xl text-green-900">{successRate.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700">Avg Latency</CardDescription>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-4xl text-purple-900">{averageLatency.toFixed(0)}ms</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-700">Query Types</CardDescription>
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <CardTitle className="text-4xl text-orange-900">{queryDistribution.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Query Distribution and Top Queries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              Query Distribution by Type
            </CardTitle>
            <CardDescription>Breakdown of search types used</CardDescription>
          </CardHeader>
          <CardContent>
            {queryDistribution.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={queryDistribution}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {queryDistribution.map((entry, index) => (
                        <Cell key={`cell-${entry.type}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {queryDistribution.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-medium text-gray-700">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600">{item.count} queries</span>
                        <span className="text-sm text-gray-500">
                          ({((item.count / totalSearches) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">No query distribution data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Top Search Queries
            </CardTitle>
            <CardDescription>Most popular search terms</CardDescription>
          </CardHeader>
          <CardContent>
            {topQueries.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topQueries.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="query" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {topQueries.slice(0, 8).map((item, index) => (
                    <div key={`${item.query}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-700">{item.query}</span>
                      </div>
                      <span className="text-gray-600 font-semibold">{item.count} searches</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">No query data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latency Performance Metrics */}
      {latencyByType && latencyByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Latency Performance by Search Type
            </CardTitle>
            <CardDescription>Average, P95, and P99 latency metrics in milliseconds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Search Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Average</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">P95</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">P99</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {latencyByType.map((item, index) => {
                    const performanceRating = item.avgLatency < 50 ? 'Excellent' : 
                                            item.avgLatency < 100 ? 'Good' : 
                                            item.avgLatency < 200 ? 'Fair' : 'Needs Improvement';
                    const performanceColor = item.avgLatency < 50 ? 'text-green-600 bg-green-50' : 
                                           item.avgLatency < 100 ? 'text-blue-600 bg-blue-50' : 
                                           item.avgLatency < 200 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                    
                    return (
                      <tr key={item.type} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-3 px-4 font-medium text-gray-900">{item.type}</td>
                        <td className="py-3 px-4 text-right text-gray-700">{item.avgLatency.toFixed(0)}ms</td>
                        <td className="py-3 px-4 text-right text-gray-700">{item.p95.toFixed(0)}ms</td>
                        <td className="py-3 px-4 text-right text-gray-700">{item.p99.toFixed(0)}ms</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${performanceColor}`}>
                            {performanceRating}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latencyByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgLatency" name="Average" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="p95" name="P95" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="p99" name="P99" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">About Latency Metrics:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Average:</strong> Mean response time for all queries</li>
                    <li><strong>P95:</strong> 95% of queries complete within this time</li>
                    <li><strong>P99:</strong> 99% of queries complete within this time</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-white rounded-lg border border-indigo-100">
              <div className="text-sm text-gray-600 mb-1">Overall Health</div>
              <div className="text-2xl font-bold text-indigo-900">
                {successRate >= 95 ? '🟢 Excellent' : successRate >= 90 ? '🟡 Good' : '🔴 Needs Attention'}
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-indigo-100">
              <div className="text-sm text-gray-600 mb-1">Most Used Type</div>
              <div className="text-2xl font-bold text-indigo-900">
                {queryDistribution.length > 0 
                  ? queryDistribution.reduce((max, item) => item.count > max.count ? item : max, queryDistribution[0]).type
                  : 'N/A'
                }
              </div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-indigo-100">
              <div className="text-sm text-gray-600 mb-1">Top Query</div>
              <div className="text-2xl font-bold text-indigo-900 truncate">
                {topQueries.length > 0 ? topQueries[0].query : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
