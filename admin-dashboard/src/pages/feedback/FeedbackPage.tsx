import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import apiService from '../../services/api.service';
import { Feedback, FeedbackStatus, FeedbackType, FeedbackPriority } from '../../types/feedback.types';
import { FeedbackDetailModal } from '../../components/feedback/FeedbackDetailModal';
import { AddNoteModal } from '../../components/feedback/AddNoteModal';

/**
 * Feedback Management Page
 * List, view, and manage user feedback submissions
 */
export const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notesFeedbackId, setNotesFeedbackId] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  
  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadFeedbacks();
    loadStats();
  }, [filterType, filterStatus, filterPriority]);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const response = await apiService.getAllFeedback(params);
      if (response.success && response.data) {
        setFeedbacks(response.data.items || response.data.feedback || []);
        setTotalCount(response.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getFeedbackStats();
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewDetails = async (feedbackId: string) => {
    try {
      const response = await apiService.getFeedback(feedbackId);
      if (response.success && response.data) {
        setSelectedFeedback(response.data.feedback);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error loading feedback details:', error);
    }
  };

  const handleUpvote = async (feedbackId: string) => {
    try {
      await apiService.upvoteFeedback(feedbackId);
      loadFeedbacks(); // Reload to show updated upvote count
    } catch (error) {
      console.error('Error upvoting feedback:', error);
    }
  };

  const handleAddNote = (feedbackId: string) => {
    setNotesFeedbackId(feedbackId);
    setShowNoteModal(true);
  };

  const handleNoteAdded = () => {
    setShowNoteModal(false);
    setNotesFeedbackId(null);
    loadFeedbacks();
  };

  const handleStatusChange = async (feedbackId: string, newStatus: FeedbackStatus) => {
    try {
      await apiService.updateFeedbackStatus(feedbackId, newStatus);
      loadFeedbacks();
      if (selectedFeedback?.id === feedbackId) {
        const response = await apiService.getFeedback(feedbackId);
        if (response.success && response.data) {
          setSelectedFeedback(response.data.feedback);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status: FeedbackStatus) => {
    const colors = {
      [FeedbackStatus.NEW]: 'bg-blue-100 text-blue-800',
      [FeedbackStatus.ACKNOWLEDGED]: 'bg-purple-100 text-purple-800',
      [FeedbackStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [FeedbackStatus.RESOLVED]: 'bg-green-100 text-green-800',
      [FeedbackStatus.CLOSED]: 'bg-gray-100 text-gray-800',
      [FeedbackStatus.WONT_FIX]: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: FeedbackPriority) => {
    const colors = {
      [FeedbackPriority.CRITICAL]: 'text-red-600 bg-red-50',
      [FeedbackPriority.HIGH]: 'text-orange-600 bg-orange-50',
      [FeedbackPriority.MEDIUM]: 'text-yellow-600 bg-yellow-50',
      [FeedbackPriority.LOW]: 'text-blue-600 bg-blue-50',
    };
    return colors[priority] || 'text-gray-600 bg-gray-50';
  };

  const getTypeIcon = (type: FeedbackType) => {
    const icons = {
      [FeedbackType.BUG_REPORT]: '🐛',
      [FeedbackType.FEATURE_REQUEST]: '✨',
      [FeedbackType.AI_ERROR]: '🤖',
      [FeedbackType.CATEGORIZATION_ERROR]: '📁',
      [FeedbackType.SUMMARY_ERROR]: '📝',
      [FeedbackType.ENTITY_ERROR]: '🏷️',
      [FeedbackType.URGENCY_ERROR]: '⚡',
      [FeedbackType.GENERAL_FEEDBACK]: '💬',
      [FeedbackType.CONTENT_QUALITY]: '⭐',
      [FeedbackType.PERFORMANCE_ISSUE]: '🚀',
    };
    return icons[type] || '📋';
  };

  if (loading && feedbacks.length === 0) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-500 mt-1">View and manage user feedback submissions</p>
        </div>
        <button
          onClick={loadFeedbacks}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl transition-all hover:shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <div className="text-sm text-blue-700">Total Feedback</div>
              <div className="text-3xl font-bold text-blue-900">{stats.total || 0}</div>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader>
              <div className="text-sm text-green-700">Resolved</div>
              <div className="text-3xl font-bold text-green-900">
                {stats.byStatus?.[FeedbackStatus.RESOLVED] || 0}
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader>
              <div className="text-sm text-yellow-700">In Progress</div>
              <div className="text-3xl font-bold text-yellow-900">
                {stats.byStatus?.[FeedbackStatus.IN_PROGRESS] || 0}
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader>
              <div className="text-sm text-purple-700">New</div>
              <div className="text-3xl font-bold text-purple-900">
                {stats.byStatus?.[FeedbackStatus.NEW] || 0}
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                {Object.values(FeedbackType).map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                {Object.values(FeedbackStatus).map(status => (
                  <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Priorities</option>
                {Object.values(FeedbackPriority).map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Items ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Spinner size="md" />
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg">No feedback found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getTypeIcon(feedback.type)}</span>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {feedback.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(feedback.status)}`}>
                          {feedback.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(feedback.priority)}`}>
                          {feedback.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{feedback.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>ID: {feedback.id.slice(0, 8)}...</span>
                        <span>User: {feedback.userId.slice(0, 8)}...</span>
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                        {feedback.tags && feedback.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            {feedback.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded">{tag}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Upvote Button */}
                      <button
                        onClick={() => handleUpvote(feedback.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Upvote"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">{feedback.upvotes}</span>
                      </button>
                      
                      {/* Add Note Button */}
                      <button
                        onClick={() => handleAddNote(feedback.id)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                        title="Add Note"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {/* View Details Button */}
                      <button
                        onClick={() => handleViewDetails(feedback.id)}
                        className="px-3 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl transition-all hover:shadow-md text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showDetailModal && selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFeedback(null);
          }}
          onStatusChange={handleStatusChange}
          onRefresh={() => handleViewDetails(selectedFeedback.id)}
        />
      )}

      {showNoteModal && notesFeedbackId && (
        <AddNoteModal
          feedbackId={notesFeedbackId}
          onClose={() => {
            setShowNoteModal(false);
            setNotesFeedbackId(null);
          }}
          onNoteAdded={handleNoteAdded}
        />
      )}
    </div>
  );
};
