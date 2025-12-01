import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import apiService from '../../services/api.service';

interface Dump {
  id: string;
  raw_content: string;
  ai_summary?: string;
  content_type: string;
  category?: { name: string; id: string };
  ai_confidence: number;
  created_at: string;
  updated_at?: string;
  user: { phone_number: string; id: string };
  extracted_entities?: any;
  metadata?: any;
}

/**
 * Dumps Overview Page (T082)
 * Status monitoring, filtering, and search
 */
export const DumpsPage: React.FC = () => {
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDump, setSelectedDump] = useState<Dump | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleRowClick = async (dumpId: string) => {
    setLoadingDetail(true);
    setIsModalOpen(true);
    try {
      const response = await apiService.getDump(dumpId);
      if (response.success && response.data) {
        setSelectedDump(response.data);
      }
    } catch (error) {
      console.error('[DumpsPage] Error loading dump details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDump(null);
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
                  <TableRow 
                    key={dump.id}
                    onClick={() => handleRowClick(dump.id)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
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

      {/* Dump Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Dump Details"
        size="lg"
      >
        {loadingDetail && (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        )}
        
        {!loadingDetail && selectedDump && (
          <div className="space-y-6">
            {/* Content */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Content</h3>
              <p className="text-slate-900 bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                {selectedDump.raw_content || '[No content]'}
              </p>
            </div>

            {/* AI Summary */}
            {selectedDump.ai_summary && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">AI Summary</h3>
                <p className="text-slate-700 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {selectedDump.ai_summary}
                </p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Category</h3>
                <Badge variant="default">{selectedDump.category?.name || 'Uncategorized'}</Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">AI Confidence</h3>
                <Badge variant={selectedDump.ai_confidence > 70 ? 'success' : 'warning'}>
                  {selectedDump.ai_confidence}%
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Content Type</h3>
                <span className="text-slate-900 font-mono text-sm">{selectedDump.content_type}</span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">User</h3>
                <span className="text-slate-900 font-mono text-sm">{selectedDump.user.phone_number}</span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Created</h3>
                <span className="text-slate-700 text-sm">
                  {new Date(selectedDump.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {selectedDump.updated_at && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Updated</h3>
                  <span className="text-slate-700 text-sm">
                    {new Date(selectedDump.updated_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Extracted Entities */}
            {selectedDump.extracted_entities && Object.keys(selectedDump.extracted_entities).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Extracted Entities</h3>
                <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-60">
                  {JSON.stringify(selectedDump.extracted_entities, null, 2)}
                </pre>
              </div>
            )}

            {/* Metadata */}
            {selectedDump.metadata && Object.keys(selectedDump.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Metadata</h3>
                <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-60">
                  {JSON.stringify(selectedDump.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* ID (for reference) */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">ID</h3>
              <code className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                {selectedDump.id}
              </code>
            </div>
          </div>
        )}
        
        {!loadingDetail && !selectedDump && (
          <div className="text-center py-8 text-slate-500">
            <p>No dump selected</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
