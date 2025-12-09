import React, { useState } from 'react';
import { Feedback, FeedbackStatus } from '../../types/feedback.types';

interface FeedbackDetailModalProps {
  feedback: Feedback;
  onClose: () => void;
  onStatusChange: (feedbackId: string, newStatus: FeedbackStatus) => void;
  onRefresh: () => void;
}

export const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  feedback,
  onClose,
  onStatusChange,
  onRefresh,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(feedback.status);
  const [resolution, setResolution] = useState(feedback.resolution || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      await onStatusChange(feedback.id, selectedStatus);
      onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-indigo-700">
            <h3 className="text-xl font-semibold text-white">Feedback Details</h3>
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
            {/* Basic Info */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{feedback.title}</h4>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
                      {feedback.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      feedback.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      feedback.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      feedback.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {feedback.priority} Priority
                    </span>
                    <span className="flex items-center gap-1 text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="font-semibold">{feedback.upvotes} upvotes</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Feedback ID</div>
                  <div className="font-mono text-sm text-gray-900">{feedback.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">User ID</div>
                  <div className="font-mono text-sm text-gray-900">{feedback.userId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="text-sm text-gray-900">
                    {new Date(feedback.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Updated</div>
                  <div className="text-sm text-gray-900">
                    {new Date(feedback.updatedAt).toLocaleString()}
                  </div>
                </div>
                {feedback.dumpId && (
                  <div>
                    <div className="text-sm text-gray-600">Related Dump</div>
                    <div className="font-mono text-sm text-gray-900">{feedback.dumpId}</div>
                  </div>
                )}
                {feedback.url && (
                  <div>
                    <div className="text-sm text-gray-600">URL</div>
                    <div className="text-sm text-gray-900 truncate">{feedback.url}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h5 className="text-lg font-semibold text-gray-900 mb-2">Description</h5>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{feedback.description}</p>
              </div>
            </div>

            {/* Reproduction Steps */}
            {feedback.reproductionSteps && feedback.reproductionSteps.length > 0 && (
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-2">Reproduction Steps</h5>
                <ol className="list-decimal list-inside space-y-2 p-4 bg-gray-50 rounded-lg">
                  {feedback.reproductionSteps.map((step, index) => (
                    <li key={index} className="text-gray-700">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Expected vs Actual Behavior */}
            {(feedback.expectedBehavior || feedback.actualBehavior) && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                {feedback.expectedBehavior && (
                  <div>
                    <h5 className="text-lg font-semibold text-gray-900 mb-2">Expected Behavior</h5>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-gray-700">{feedback.expectedBehavior}</p>
                    </div>
                  </div>
                )}
                {feedback.actualBehavior && (
                  <div>
                    <h5 className="text-lg font-semibold text-gray-900 mb-2">Actual Behavior</h5>
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-gray-700">{feedback.actualBehavior}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {feedback.tags && feedback.tags.length > 0 && (
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {feedback.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Notes */}
            {feedback.internalNotes && feedback.internalNotes.length > 0 && (
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-2">Internal Notes</h5>
                <div className="space-y-2">
                  {feedback.internalNotes.map((note, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-gray-700">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Management */}
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h5 className="text-lg font-semibold text-gray-900 mb-3">Status Management</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as FeedbackStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Object.values(FeedbackStatus).map(status => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                {feedback.resolution && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution
                    </label>
                    <div className="p-3 bg-white border border-gray-300 rounded-lg">
                      <p className="text-gray-700">{feedback.resolution}</p>
                    </div>
                  </div>
                )}

                {feedback.resolvedAt && (
                  <div className="text-sm text-gray-600">
                    Resolved on {new Date(feedback.resolvedAt).toLocaleString()}
                    {feedback.resolvedBy && ` by ${feedback.resolvedBy}`}
                  </div>
                )}

                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === feedback.status}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {/* Additional Context */}
            {feedback.additionalContext && Object.keys(feedback.additionalContext).length > 0 && (
              <div className="mb-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-2">Additional Context</h5>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <pre className="text-sm text-gray-700 overflow-x-auto">
                    {JSON.stringify(feedback.additionalContext, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
