import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api.service';

interface SystemMetrics {
  totalUsers: number;
  totalDumps: number;
  averageProcessingTime: number;
  dailyStats: Array<{ date: string; dumps: number; users: number }>;
}

/**
 * System Analytics Dashboard (T083)
 * Performance metrics and usage statistics
 */
export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const response = await apiService.getSystemMetrics();
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
      <h1 className="text-3xl font-bold">System Analytics</h1>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalUsers.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Total Dumps</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalDumps.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Avg Processing Time</CardDescription>
            <CardTitle className="text-4xl">{metrics.averageProcessingTime.toFixed(2)}s</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dumps" stroke="#3b82f6" name="Dumps" />
              <Line type="monotone" dataKey="users" stroke="#10b981" name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.dailyStats.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="dumps" fill="#3b82f6" name="Dumps" />
              <Bar dataKey="users" fill="#10b981" name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
