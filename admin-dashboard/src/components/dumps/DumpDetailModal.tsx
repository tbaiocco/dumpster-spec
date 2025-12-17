import React from 'react';

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

interface DumpDetailModalProps {
  dump: Dump;
  onClose: () => void;
  loading?: boolean;
}

export const DumpDetailModal: React.FC<DumpDetailModalProps> = ({ dump, onClose, loading }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-emerald-700">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-white">Dump Details</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <>
                {/* Raw Content */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Original Content
                  </h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{dump.raw_content || '[No content]'}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {dump.ai_summary && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Summary
                    </h4>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-900">{dump.ai_summary}</p>
                    </div>
                  </div>
                )}

                {/* Metadata Grid */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Metadata</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
                      <div className="text-sm text-green-700 mb-1">Category</div>
                      <div className="font-semibold text-gray-900">{dump.category?.name || 'Uncategorized'}</div>
                    </div>
                    
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-700 mb-1">AI Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">{dump.ai_confidence}%</div>
                        <div className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          dump.ai_confidence > 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {dump.ai_confidence > 70 ? 'High' : 'Low'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                      <div className="text-sm text-purple-700 mb-1">Content Type</div>
                      <div className="font-mono text-sm text-gray-900">{dump.content_type}</div>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg">
                      <div className="text-sm text-indigo-700 mb-1">User</div>
                      <div className="font-mono text-sm text-gray-900">{dump.user.phone_number}</div>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
                      <div className="text-sm text-orange-700 mb-1">Created</div>
                      <div className="text-sm text-gray-900">
                        {new Date(dump.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {dump.updated_at && (
                      <div className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-700 mb-1">Last Updated</div>
                        <div className="text-sm text-gray-900">
                          {new Date(dump.updated_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Entities */}
                {dump.extracted_entities && Object.keys(dump.extracted_entities).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Extracted Entities
                    </h4>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <pre className="text-xs text-purple-900 overflow-auto max-h-60 whitespace-pre-wrap">
                        {JSON.stringify(dump.extracted_entities, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Additional Metadata */}
                {dump.metadata && Object.keys(dump.metadata).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Additional Metadata
                    </h4>
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <pre className="text-xs text-indigo-900 overflow-auto max-h-60 whitespace-pre-wrap">
                        {JSON.stringify(dump.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* ID Reference */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Dump ID</div>
                  <code className="text-xs text-gray-900 font-mono bg-white px-3 py-2 rounded border border-gray-300 block">
                    {dump.id}
                  </code>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
