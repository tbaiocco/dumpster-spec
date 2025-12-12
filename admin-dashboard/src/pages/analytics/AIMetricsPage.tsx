import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import apiService from '../../services/api.service';

interface CategoryStat {
  category: string;
  count: number;
  avgConfidence: string;
}

interface AIMetrics {
  totalProcessed: number;
  successfullyProcessed: number;
  processingSuccessRate: number;
  averageConfidence: number;
  confidenceDistribution: Array<{ range: string; count: number }>;
  categoryBreakdown: CategoryStat[];
  lowConfidenceCount: number;
  needsReview: number;
}

/**
 * AI Processing Metrics (T087)
 * Confidence tracking and processing statistics - UPDATED FOR REAL DATA
 */
export const AIMetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    const response = await apiService.getAIMetrics();
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AI Processing Metrics</h1>
          </div>
          <button
            onClick={loadMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p className="text-gray-600 ml-14">Real-time confidence tracking and processing statistics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card hover className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-pink-700">Total Processed</CardDescription>
              <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-5xl font-display text-pink-900">{metrics.totalProcessed?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700">Success Rate</CardDescription>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle className="text-5xl font-display text-green-900">{metrics.processingSuccessRate}%</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700">Avg Confidence</CardDescription>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <CardTitle className="text-5xl font-display text-blue-900">{(metrics.averageConfidence * 100).toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>

        <Card hover className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-700">Needs Review</CardDescription>
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <CardTitle className="text-5xl font-display text-amber-900">{metrics.needsReview?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Confidence Distribution */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Confidence Distribution
            </CardTitle>
            <CardDescription>Distribution of AI confidence scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.confidenceDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#ec4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-display flex items-center gap-2">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Category Performance
            </CardTitle>
            <CardDescription>Top categories by AI processing volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(metrics.categoryBreakdown || []).slice(0, 8).map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cat.category}</p>
                      <p className="text-sm text-slate-500">{cat.count} items</p>
                    </div>
                  </div>
                  <Badge variant={Number.parseFloat(cat.avgConfidence) > 80 ? 'success' : Number.parseFloat(cat.avgConfidence) > 60 ? 'warning' : 'error'}>
                    {Number.parseFloat(cat.avgConfidence).toFixed(1)}% conf
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Summary */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-display">Processing Summary</CardTitle>
          <CardDescription>Detailed breakdown of AI processing results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-xl border-2 border-green-100 bg-green-50 p-6 hover:shadow-md transition-shadow">
              <div>
                <span className="text-sm font-medium text-green-700">Successfully Processed</span>
                <p className="text-3xl font-bold text-green-900 mt-1">{metrics.successfullyProcessed?.toLocaleString() || 0}</p>
              </div>
              <Badge variant="success" className="text-lg px-4 py-2">{metrics.processingSuccessRate}%</Badge>
            </div>
            
            <div className="flex items-center justify-between rounded-xl border-2 border-amber-100 bg-amber-50 p-6 hover:shadow-md transition-shadow">
              <div>
                <span className="text-sm font-medium text-amber-700">Low Confidence</span>
                <p className="text-3xl font-bold text-amber-900 mt-1">{metrics.lowConfidenceCount?.toLocaleString() || 0}</p>
              </div>
              <Badge variant="warning" className="text-lg px-4 py-2">
                {metrics.totalProcessed > 0 ? ((metrics.lowConfidenceCount / metrics.totalProcessed) * 100).toFixed(1) : 0}%
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl border-2 border-blue-100 bg-blue-50 p-6 hover:shadow-md transition-shadow">
              <div>
                <span className="text-sm font-medium text-blue-700">Categories</span>
                <p className="text-3xl font-bold text-blue-900 mt-1">{metrics.categoryBreakdown?.length || 0}</p>
              </div>
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
