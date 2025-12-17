import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Users, TrendingUp, Calendar, Activity } from 'lucide-react';
import apiService from '../../services/api.service';

interface UserStats {
  activeLastWeek: number;
  activeLastMonth: number;
  activeLastQuarter: number;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  averageDumpsPerUser: number;
}

/**
 * User Statistics Page
 * Active user tracking and registration trends
 */
export const UserStatsPage: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const response = await apiService.getUserStats();
    if (response.success && response.data) {
      setStats(response.data);
    }
    setLoading(false);
  };

  if (loading || !stats) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">User Statistics</h1>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p className="text-gray-600 ml-14">Active user tracking and engagement metrics</p>
      </div>

      {/* Active Users Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700">Active Last Week</CardDescription>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-5xl font-display text-green-900">
              {stats.activeLastWeek?.toLocaleString() || 0}
            </CardTitle>
            <p className="text-sm text-green-600 mt-2">users in past 7 days</p>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700">Active Last Month</CardDescription>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-5xl font-display text-blue-900">
              {stats.activeLastMonth?.toLocaleString() || 0}
            </CardTitle>
            <p className="text-sm text-blue-600 mt-2">users in past 30 days</p>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700">Active Last Quarter</CardDescription>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-5xl font-display text-purple-900">
              {stats.activeLastQuarter?.toLocaleString() || 0}
            </CardTitle>
            <p className="text-sm text-purple-600 mt-2">users in past 90 days</p>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-700">Avg Dumps/User</CardDescription>
              <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <CardTitle className="text-5xl font-display text-cyan-900">
              {stats.averageDumpsPerUser?.toFixed(1) || '0.0'}
            </CardTitle>
            <p className="text-sm text-cyan-600 mt-2">dumps per user</p>
          </CardHeader>
        </Card>
      </div>

      {/* Registration Trends */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Monthly Registration Trends
          </CardTitle>
          <CardDescription>New user registrations over the past 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={stats.monthlyRegistrations || []}>
              <defs>
                <linearGradient id="registrationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  backgroundColor: 'white'
                }}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#registrationGradient)"
                name="New Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-600" />
              Activity Overview
            </CardTitle>
            <CardDescription>User engagement across different time periods</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { period: '7 Days', users: stats.activeLastWeek },
                { period: '30 Days', users: stats.activeLastMonth },
                { period: '90 Days', users: stats.activeLastQuarter }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="users" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Retention Insights
            </CardTitle>
            <CardDescription>User retention and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Weekly Retention Rate</span>
                  <Badge variant="success" className="text-lg px-4 py-1">
                    {stats.activeLastMonth > 0 
                      ? ((stats.activeLastWeek / stats.activeLastMonth) * 100).toFixed(1)
                      : '0'}%
                  </Badge>
                </div>
                <p className="text-xs text-green-600">Users active in past week vs. month</p>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Monthly Retention Rate</span>
                  <Badge variant="info" className="text-lg px-4 py-1">
                    {stats.activeLastQuarter > 0 
                      ? ((stats.activeLastMonth / stats.activeLastQuarter) * 100).toFixed(1)
                      : '0'}%
                  </Badge>
                </div>
                <p className="text-xs text-blue-600">Users active in past month vs. quarter</p>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">User Engagement Score</span>
                  <Badge 
                    variant={stats.averageDumpsPerUser > 10 ? 'success' : stats.averageDumpsPerUser > 5 ? 'warning' : 'error'}
                    className="text-lg px-4 py-1"
                  >
                    {stats.averageDumpsPerUser > 10 ? 'High' : stats.averageDumpsPerUser > 5 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
                <p className="text-xs text-purple-600">Based on average dumps per user: {stats.averageDumpsPerUser?.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
