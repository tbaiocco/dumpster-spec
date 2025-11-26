import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import apiService from '../../services/api.service';

interface Dump {
  id: string;
  raw_content: string;
  ai_summary?: string;
  content_type: string;
  category?: { name: string };
  ai_confidence: number;
  created_at: string;
  user: { phone_number: string };
}

/**
 * Dumps Overview Page (T082)
 * Status monitoring, filtering, and search
 */
export const DumpsPage: React.FC = () => {
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDumps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadDumps = async () => {
    setLoading(true);
    const response = await apiService.getDumps({ limit: 50, search: searchQuery });
    console.log('[DumpsPage] API response:', response);
    if (response.success && response.data) {
      // Backend returns { dumps: [...], total, page, totalPages }
      console.log('[DumpsPage] Setting dumps:', response.data.dumps);
      setDumps(response.data.dumps || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-gradient">📝 Dumps Overview</h1>
        <p className="text-lg text-slate-600">Monitor and manage all content dumps</p>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle>Recent Dumps</CardTitle>
          <CardDescription>View and search all content dumps across users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="🔍 Search dumps by content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/5">Content</TableHead>
                  <TableHead className="w-1/6">Category</TableHead>
                  <TableHead className="w-1/8">Confidence</TableHead>
                  <TableHead className="w-1/6">User</TableHead>
                  <TableHead className="w-1/6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dumps.map((dump) => (
                  <TableRow key={dump.id}>
                    <TableCell className="max-w-md">
                      <div className="truncate text-slate-900">
                        {dump.raw_content || dump.ai_summary || `[${dump.content_type}]`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{dump.category?.name || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={dump.ai_confidence > 70 ? 'success' : 'warning'}>
                        {dump.ai_confidence}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">
                      {dump.user.phone_number}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(dump.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {dumps.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-6xl mb-4 opacity-50">📭</div>
              <p className="text-sm">No dumps found. Try adjusting your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
