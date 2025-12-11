import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api.service';

interface SystemMetrics {
  totalUsers: number;
  totalDumps: number;
  totalReminders: number;
  activeUsers: number;
  averageProcessingTime: number;
  processingSuccessRate: number;
  dailyStats: Array<{ date: string; dumps: number; users: number }>;
  storage: {
    totalFiles: number;
    byType: Array<{ type: string; count: number }>;
    totalSizeMB: number;
  };
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
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-gradient">📊 System Analytics</h1>
        <p className="text-lg text-slate-600">Real-time system metrics and performance overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card hover className="bg-gradient-to-br from-primary-50 to-white border-primary-100">
          <CardHeader>
            <CardDescription className="text-primary-600 font-medium">Total Users</CardDescription>
            <CardTitle className="text-5xl font-display text-primary-700">{metrics.totalUsers?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardHeader>
            <CardDescription className="text-emerald-600 font-medium">Total Dumps</CardDescription>
            <CardTitle className="text-5xl font-display text-emerald-700">{metrics.totalDumps?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
          <CardHeader>
            <CardDescription className="text-violet-600 font-medium">Active Users</CardDescription>
            <CardTitle className="text-5xl font-display text-violet-700">{metrics.activeUsers?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardHeader>
            <CardDescription className="text-amber-600 font-medium">Avg Processing</CardDescription>
            <CardTitle className="text-5xl font-display text-amber-700">{metrics.averageProcessingTime?.toFixed(2) || 0}s</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Processing Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card hover>
          <CardHeader>
            <CardDescription>Processing Success Rate</CardDescription>
            <div className="flex items-center gap-3">
              <CardTitle className="text-5xl font-display">{metrics.processingSuccessRate || 0}%</CardTitle>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.processingSuccessRate || 0}%` }}
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card hover>
          <CardHeader>
            <CardDescription>Total Storage</CardDescription>
            <CardTitle className="text-5xl font-display">{metrics.storage?.totalSizeMB?.toFixed(2) || 0} <span className="text-2xl text-slate-400">MB</span></CardTitle>
            <p className="text-sm text-slate-500 mt-2">{metrics.storage?.totalFiles?.toLocaleString() || 0} files stored</p>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display">Daily Activity Trend</CardTitle>
          <CardDescription>Activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={metrics.dailyStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey="dumps" 
                stroke="#0ea5e9" 
                strokeWidth={3}
                name="Dumps" 
                dot={{ fill: '#0ea5e9', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Active Users" 
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display">Weekly Overview</CardTitle>
          <CardDescription>Last 7 days comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={(metrics.dailyStats || []).slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="dumps" fill="#0ea5e9" name="Dumps" radius={[8, 8, 0, 0]} />
              <Bar dataKey="users" fill="#10b981" name="Users" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
