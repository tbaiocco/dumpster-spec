import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import apiService from '../../services/api.service';

interface User {
  id: string;
  phone_number: string;
  verified_at: string;
  chat_id_telegram?: string | null;
  chat_id_whatsapp?: string | null;
  chat_ids?: string[];
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

/**
 * User Management Page (T081)
 * CRUD operations for user management
 */
export const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1); // Pagination support for future enhancement
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    const response = await apiService.getUsers({ page, limit: 20, search: searchQuery });
    if (response.success && response.data) {
      setUsers(response.data.users || []);
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
        <h1 className="text-4xl font-display font-bold text-gradient">👥 User Management</h1>
        <p className="text-lg text-slate-600">Manage and monitor user accounts</p>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="🔍 Search users by phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.phone_number}</TableCell>
                  <TableCell>
                    <Badge variant={user.verified_at ? 'success' : 'error'}>
                      {user.verified_at ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {user.verified_at ? new Date(user.verified_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowModal(true);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>      {/* User Details Modal */}
      <Modal
        isOpen={showModal && selectedUser !== null}
        onClose={() => {
          setShowModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="modal-section">
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                Contact Information
              </h3>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Phone Number:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {selectedUser.phone_number}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Verification Status:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)' }}>
                    <Badge variant={selectedUser.verified_at ? 'success' : 'error'}>
                      {selectedUser.verified_at ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
                {selectedUser.verified_at && (
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Verified At:</strong>
                    <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                      {new Date(selectedUser.verified_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                User Preferences
              </h3>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Timezone:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {selectedUser.timezone || 'Not set'}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Language:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {selectedUser.language || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                Chat Integration
              </h3>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Chat IDs:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {selectedUser.chat_ids && selectedUser.chat_ids.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                        {selectedUser.chat_ids.map((chatId: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {chatId}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>No chat IDs</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-primary)' }}>
                Account Information
              </h3>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>User ID:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {selectedUser.id}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Created At:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Last Updated:</strong>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-base)' }}>
                    {new Date(selectedUser.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
