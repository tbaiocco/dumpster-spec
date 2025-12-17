import React, { useState } from 'react';

interface Review {
  id: string;
  dump: {
    id: string;
    rawContent: string;
    category?: { name: string };
    aiConfidence: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  flaggedAt: string;
  user?: {
    id: string;
    phoneNumber: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface ReviewDetailModalProps {
  review: Review;
  categories: Category[];
  onClose: () => void;
  onApprove: (dumpId: string, data: { raw_content?: string; category?: string; notes?: string }) => Promise<void>;
  onReject: (dumpId: string, reason: string, notes?: string) => Promise<void>;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({
  review,
  categories,
  onClose,
  onApprove,
  onReject,
}) => {
  const [editedContent, setEditedContent] = useState(review.dump.rawContent);
  const [selectedCategory, setSelectedCategory] = useState(review.dump.category?.name || '');
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const payload: { raw_content?: string; category?: string; notes?: string } = {};
      
      if (editedContent !== review.dump.rawContent) {
        payload.raw_content = editedContent;
      }
      if (selectedCategory) {
        payload.category = selectedCategory;
      }
      if (notes) {
        payload.notes = notes;
      }
      
      await onApprove(review.dump.id, payload);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setIsProcessing(true);
    try {
      await onReject(review.dump.id, rejectReason, notes || undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-700">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-white">Review Content</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              disabled={isProcessing}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Status Info */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 ${getPriorityColor(review.priority)}`}>
                <div className="text-sm font-semibold mb-1">Priority Level</div>
                <div className="text-xl font-bold uppercase">{review.priority}</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                <div className="text-sm font-semibold text-blue-800 mb-1">AI Confidence</div>
                <div className="text-xl font-bold text-blue-900">{review.dump.aiConfidence}%</div>
              </div>
            </div>

            {/* Editable Content */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Content
                <span className="ml-2 text-xs font-normal text-gray-500">(Editable)</span>
              </label>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                placeholder="Edit content here..."
              />
            </div>

            {/* Category Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
              {review.dump.category && (
                <div className="mt-2 text-sm text-gray-600">
                  Current: <span className="font-semibold">{review.dump.category.name}</span>
                </div>
              )}
            </div>

            {/* Rejection Reason */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Rejection Reason
                <span className="ml-2 text-xs font-normal text-red-600">(Required for rejection)</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Why is this content being rejected? (e.g., 'Spam', 'Inappropriate content', 'Low quality')..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
            </div>

            {/* Review Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Additional Notes
                <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional notes about this review decision..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
            </div>

            {/* User Info */}
            {review.user && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-semibold text-indigo-900">User Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-indigo-700">Phone Number</div>
                    <div className="font-mono text-sm text-indigo-900">{review.user.phoneNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-indigo-700">User ID</div>
                    <div className="font-mono text-xs text-indigo-900">{review.user.id.slice(0, 16)}...</div>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm font-semibold text-gray-900 mb-3">Review Metadata</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Review ID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-900">{review.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Flagged:</span>
                  <span className="ml-2 text-gray-900">{new Date(review.flaggedAt).toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Dump ID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-900">{review.dump.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Make a decision on this flagged content
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {isProcessing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isProcessing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
