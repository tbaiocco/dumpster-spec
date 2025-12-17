import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Zap, TrendingUp, Award, Activity } from 'lucide-react';
import apiService from '../../services/api.service';

interface FeatureBreakdown {
  feature: string;
  count: number;
  percentage: number;
}

interface FeatureStats {
  totalUsage: number;
  mostPopular: string;
  breakdown: FeatureBreakdown[];
}

const FEATURE_COLORS = ['#B929EB', '#2DD9F6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const FEATURE_LABELS: { [key: string]: string } = {
  'BOT_COMMAND': 'Bot Commands',
  'EMAIL_PROCESSED': 'Email Processing',
  'DUMP_CREATED': 'Dumps Created',
  'SEARCH_PERFORMED': 'Searches',
  'TRACKING_CREATED': 'Tracking Created',
  'CALENDAR_SYNCED': 'Calendar Syncs',
  'REMINDER_SENT': 'Reminders Sent'
};

const FEATURE_ICONS: { [key: string]: React.ReactNode } = {
  'BOT_COMMAND': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>,
  'EMAIL_PROCESSED': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>,
  'DUMP_CREATED': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>,
  'SEARCH_PERFORMED': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>,
  'TRACKING_CREATED': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>,
  'CALENDAR_SYNCED': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>,
  'REMINDER_SENT': <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
};

/**
 * Feature Usage Analytics Page
 * Track usage across different features and capabilities
 */
export const FeatureUsagePage: React.FC = () => {
  const [stats, setStats] = useState<FeatureStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const response = await apiService.getFeatureStats();
    if (response.success && response.data) {
      setStats(response.data);
    }
    setLoading(false);
  };

  if (loading || !stats) {
    return <Spinner size="lg" className="mt-20" />;
  }

  // Prepare data for pie chart
  const pieData = stats.breakdown.map((item, index) => ({
    name: FEATURE_LABELS[item.feature] || item.feature,
    value: item.count,
    color: FEATURE_COLORS[index % FEATURE_COLORS.length]
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Feature Usage Analytics</h1>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p className="text-gray-600 ml-14">Track usage across different features and capabilities</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700">Total Feature Usage</CardDescription>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-5xl font-display text-purple-900">
              {stats.totalUsage?.toLocaleString() || 0}
            </CardTitle>
            <p className="text-sm text-purple-600 mt-2">across all features</p>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-pink-700">Most Popular Feature</CardDescription>
              <Award className="w-8 h-8 text-pink-600" />
            </div>
            <CardTitle className="text-2xl font-display text-pink-900 mt-2">
              {FEATURE_LABELS[stats.mostPopular] || stats.mostPopular}
            </CardTitle>
            <p className="text-sm text-pink-600 mt-2">
              {stats.breakdown.find(f => f.feature === stats.mostPopular)?.count.toLocaleString() || 0} uses
            </p>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-cyan-700">Active Features</CardDescription>
              <TrendingUp className="w-8 h-8 text-cyan-600" />
            </div>
            <CardTitle className="text-5xl font-display text-cyan-900">
              {stats.breakdown?.length || 0}
            </CardTitle>
            <p className="text-sm text-cyan-600 mt-2">features in use</p>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feature Distribution Bar Chart */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600" />
              Feature Usage Distribution
            </CardTitle>
            <CardDescription>Total usage by feature type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.breakdown.map(item => ({
                ...item,
                name: FEATURE_LABELS[item.feature] || item.feature
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Uses']}
                />
                <Bar dataKey="count" fill="#B929EB" radius={[8, 8, 0, 0]}>
                  {stats.breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={FEATURE_COLORS[index % FEATURE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Percentage Distribution Pie Chart */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Usage Percentage Breakdown
            </CardTitle>
            <CardDescription>Relative usage across features</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const { name, percent } = props;
                    return `${name || ''}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                  }}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Uses']}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Feature Breakdown */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-600" />
            Detailed Feature Breakdown
          </CardTitle>
          <CardDescription>Complete feature usage statistics with percentages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.breakdown.map((item, index) => {
              const isTopFeature = item.feature === stats.mostPopular;
              return (
                <div
                  key={item.feature}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    isTopFeature
                      ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 shadow-lg'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {isTopFeature && (
                    <div className="absolute -top-3 -right-3">
                      <Badge variant="success" className="px-3 py-1 shadow-md">
                        <Award className="w-3 h-3 inline mr-1" />
                        Top Feature
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-3 rounded-lg text-white"
                        style={{ backgroundColor: FEATURE_COLORS[index % FEATURE_COLORS.length] }}
                      >
                        {FEATURE_ICONS[item.feature] || <Zap className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-lg ${isTopFeature ? 'text-amber-900' : 'text-slate-900'}`}>
                          {FEATURE_LABELS[item.feature] || item.feature}
                        </h3>
                        <p className={`text-sm ${isTopFeature ? 'text-amber-600' : 'text-slate-500'}`}>
                          {item.feature}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isTopFeature ? 'text-amber-700' : 'text-slate-600'}`}>
                        Total Uses
                      </span>
                      <span className={`text-2xl font-bold ${isTopFeature ? 'text-amber-900' : 'text-slate-900'}`}>
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage || 0}%`,
                          backgroundColor: FEATURE_COLORS[index % FEATURE_COLORS.length]
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isTopFeature ? 'text-amber-600' : 'text-slate-500'}`}>
                        Percentage of Total
                      </span>
                      <Badge 
                        variant={(item.percentage || 0) > 30 ? 'success' : (item.percentage || 0) > 15 ? 'warning' : 'default'}
                        className="px-2 py-0.5"
                      >
                        {(item.percentage || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
