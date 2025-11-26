import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import apiService from '../services/api.service';

interface Review {
  id: string;
  dump: {
    id: string;
    rawContent: string;
    category?: { name: string };
    aiConfidence: number; // 0-100 integer
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  flaggedAt: string;
  user?: {
    id: string;
    phoneNumber: string;
  };
}

/**
 * Review Interface Page (T089a)
 * Admin interface for reviewing flagged content
 */
export const ReviewPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showModal, setShowModal] = useState(false);

  console.log('[ReviewPage] Render - showModal:', showModal, 'selectedReview:', selectedReview);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const response = await apiService.getReviews({ status: 'pending' });
    console.log('[ReviewPage] API response:', response);
    if (response.success && response.data) {
      // Backend returns array directly in data field
      const reviewsData = Array.isArray(response.data) ? response.data : [];
      console.log('[ReviewPage] Setting reviews:', reviewsData);
      setReviews(reviewsData);
    }
    setLoading(false);
  };

  const handleApprove = async (dumpId: string) => {
    const response = await apiService.approveReview(dumpId, 'Approved by admin');
    if (response.success) {
      await loadReviews();
      setShowModal(false);
    }
  };

  const handleReject = async (dumpId: string) => {
    const response = await apiService.rejectReview(dumpId, 'Rejected by admin', 'Low quality content');
    if (response.success) {
      await loadReviews();
      setShowModal(false);
    }
  };

  const priorityVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <Spinner size="lg" className="mt-20" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-gradient">✅ Content Review</h1>
        <p className="text-lg text-slate-600">Review flagged content with low AI confidence scores</p>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle>
            Flagged Content 
            <span className="ml-2 text-sm font-medium text-slate-600">
              ({reviews.length} pending review)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-6xl mb-4 opacity-50">✅</div>
              <p className="text-sm">No items pending review. All content has been processed!</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell className="max-w-md truncate">{review.dump.rawContent}</TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {review.dump.category?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={review.dump.aiConfidence > 70 ? 'success' : 'error'}>
                        {review.dump.aiConfidence}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(review.priority)}>
                        {review.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(review.flaggedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('[ReviewPage] Review button clicked for:', review);
                          setSelectedReview(review);
                          setShowModal(true);
                          console.log('[ReviewPage] Modal state set to true');
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={showModal && selectedReview !== null}
        onClose={() => {
          setShowModal(false);
          setSelectedReview(null);
        }}
        title="📋 Review Content Details"
        size="lg"
      >
        {selectedReview && (
          <div className="space-y-4">
            <div style={{ 
              padding: 'var(--spacing-md)', 
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-gray-200)'
            }}>
              <h4 className="font-medium text-gray-700 mb-2" style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content</h4>
              <p className="text-gray-900" style={{ lineHeight: '1.6' }}>{selectedReview.dump.rawContent}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2" style={{ fontSize: '0.875rem' }}>Category</h4>
                <Badge variant="default">
                  {selectedReview.dump.category?.name || 'Uncategorized'}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2" style={{ fontSize: '0.875rem' }}>AI Confidence</h4>
                <Badge variant={selectedReview.dump.aiConfidence > 70 ? 'success' : 'error'}>
                  {selectedReview.dump.aiConfidence}%
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2" style={{ fontSize: '0.875rem' }}>Priority</h4>
                <Badge variant={priorityVariant(selectedReview.priority)}>
                  {selectedReview.priority}
                </Badge>
              </div>
            </div>

            {selectedReview.user && (
              <div style={{ 
                padding: 'var(--spacing-md)', 
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem'
              }}>
                <strong>User:</strong> {selectedReview.user.phoneNumber}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-slate-200">
              <Button
                variant="default"
                onClick={() => handleApprove(selectedReview.dump.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                ✓ Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedReview.dump.id)}
              >
                ✗ Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
