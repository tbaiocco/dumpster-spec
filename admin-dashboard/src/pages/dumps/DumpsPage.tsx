import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import apiService from '../../services/api.service';

interface Dump {
  id: string;
  rawContent: string;
  category?: { name: string };
  aiConfidence: number;
  createdAt: string;
  user: { phoneNumber: string };
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
    if (response.success && response.data) {
      setDumps(response.data);
    }
    setLoading(false);
  };

  if (loading) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dumps Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent Dumps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search dumps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dumps.map((dump) => (
                <TableRow key={dump.id}>
                  <TableCell className="max-w-md truncate">{dump.rawContent}</TableCell>
                  <TableCell>
                    <Badge variant="default">{dump.category?.name || 'Uncategorized'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={dump.aiConfidence > 0.7 ? 'success' : 'warning'}>
                      {Math.round(dump.aiConfidence * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{dump.user.phoneNumber}</TableCell>
                  <TableCell>{new Date(dump.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
