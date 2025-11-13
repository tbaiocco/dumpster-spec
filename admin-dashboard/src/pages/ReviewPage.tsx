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
    aiConfidence: number;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected';
  flaggedAt: string;
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

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const response = await apiService.getReviews({ status: 'pending' });
    if (response.success && response.data) {
      setReviews(response.data);
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Content Review</h1>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Content ({reviews.length} pending)</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items pending review</p>
          ) : (
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
                      <Badge variant={review.dump.aiConfidence > 0.5 ? 'success' : 'error'}>
                        {Math.round(review.dump.aiConfidence * 100)}%
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
                          setSelectedReview(review);
                          setShowModal(true);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedReview && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Review Content"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Content</h4>
              <p className="text-gray-900">{selectedReview.dump.rawContent}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Category</h4>
                <Badge variant="default">
                  {selectedReview.dump.category?.name || 'Uncategorized'}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">AI Confidence</h4>
                <Badge variant={selectedReview.dump.aiConfidence > 0.5 ? 'success' : 'error'}>
                  {Math.round(selectedReview.dump.aiConfidence * 100)}%
                </Badge>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="default"
                onClick={() => handleApprove(selectedReview.dump.id)}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedReview.dump.id)}
              >
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
