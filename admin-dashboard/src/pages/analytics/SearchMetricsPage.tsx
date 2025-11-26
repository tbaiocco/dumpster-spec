import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import apiService from '../../services/api.service';

interface SearchMetrics {
  totalSearches: number;
  averageResponseTime: number;
  searchesByType: Array<{ type: string; count: number }>;
  popularQueries: Array<{ query: string; count: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Search Performance Monitoring (T086)
 * Analytics for search functionality
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search Performance</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Total Searches</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalSearches?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-4xl">{metrics.averageResponseTime?.toFixed(0) || 0}ms</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Searches by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.searchesByType || []}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {(metrics.searchesByType || []).map((entry, index) => (
                    <Cell key={`cell-${entry.type}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(metrics.popularQueries || []).slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="query" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
