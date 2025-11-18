import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import apiService from '../../services/api.service';

interface AIMetrics {
  totalProcessed: number;
  averageConfidence: number;
  confidenceDistribution: Array<{ range: string; count: number }>;
  processingTimeByType: Array<{ type: string; avgTime: number }>;
  categorization: { accurate: number; needsReview: number; failed: number };
}

/**
 * AI Processing Metrics (T087)
 * Confidence tracking and processing statistics
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

  const accuracyRate = ((metrics.categorization?.accurate || 0) / (metrics.totalProcessed || 1) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Processing Metrics</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Processed</CardDescription>
            <CardTitle className="text-4xl">{metrics.totalProcessed?.toLocaleString() || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Average Confidence</CardDescription>
            <CardTitle className="text-4xl">{(metrics.averageConfidence * 100).toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Accuracy Rate</CardDescription>
            <CardTitle className="text-4xl">{accuracyRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorization Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="font-medium">Accurate</span>
              <Badge variant="success">{metrics.categorization?.accurate || 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="font-medium">Needs Review</span>
              <Badge variant="warning">{metrics.categorization?.needsReview || 0}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <span className="font-medium">Failed</span>
              <Badge variant="error">{metrics.categorization?.failed || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.confidenceDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Time by Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.processingTimeByType || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgTime" stroke="#10b981" name="Avg Time (s)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
