import React, { useEffect, useState } from 'react';
import apiService from '../../services/api.service';
import { Spinner } from '../../components/ui/Spinner';
import { DumpDetailModal } from '../../components/dumps/DumpDetailModal';

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
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadDumps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadDumps = async () => {
    setLoading(true);
    const response = await apiService.getDumps({ limit: 50, search: searchQuery });
    if (response.success && response.data) {
      setDumps(response.data.dumps || []);
    }
    setLoading(false);
  };

  const handleRowClick = async (dumpId: string) => {
    setLoadingDetail(true);
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
    setSelectedDump(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Calculate stats
  const totalDumps = dumps.length;
  const highConfidence = dumps.filter(d => d.ai_confidence >= 80).length;
  const avgConfidence = dumps.length > 0 
    ? Math.round(dumps.reduce((sum, d) => sum + d.ai_confidence, 0) / dumps.length) 
    : 0;
  const categoriesSet = new Set(dumps.filter(d => d.category).map(d => d.category!.name));
  const uniqueCategories = categoriesSet.size;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-800 bg-green-100 border-green-300';
    if (confidence >= 60) return 'text-yellow-800 bg-yellow-100 border-yellow-300';
    return 'text-red-800 bg-red-100 border-red-300';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Content Dumps</h1>
        </div>
        <p className="text-gray-600 ml-14">Monitor and manage all content dumps across users</p>
      </div>

      {/* Stats Cards - Clutter.AI Design */}
      {dumps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-sans text-muted">Total Dumps</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{totalDumps}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-sans text-muted">High Confidence</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12c0 5.523-4.477 10-10 10S1 17.523 1 12 5.477 2 11 2c.454 0 .901.028 1.337.082M19 6l-7 7" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{highConfidence}</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-sans text-muted">Avg Confidence</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{avgConfidence}%</div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-sans text-muted">Categories</span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-heading font-bold text-slate-900">{uniqueCategories}</div>
          </div>
        </div>
      )}

      {/* Dumps Table - Clutter.AI Design */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {dumps.map((dump) => (
                <tr key={dump.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-6 py-5">
                    <div className="flex items-start gap-2 max-w-md">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-900 line-clamp-2">{dump.raw_content}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {dump.category ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                        {dump.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getConfidenceColor(dump.ai_confidence)}`}>
                      {dump.ai_confidence}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {dump.user?.phone_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(dump.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRowClick(dump.id)}
                      className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl transition-all hover:shadow-md gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dump Detail Modal */}
      {selectedDump && !loadingDetail && (
        <DumpDetailModal
          dump={selectedDump}
          onClose={handleCloseModal}
        />
      )}

      {/* Loading Detail Modal */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>
            <div className="relative bg-white rounded-lg p-8">
              <Spinner />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
