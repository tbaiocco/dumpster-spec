import React from 'react';

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

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-xl font-semibold text-white">User Details</h3>
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
            {/* Contact Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Phone Number</div>
                  <div className="font-mono text-lg text-gray-900">{user.phone_number}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Verification Status</div>
                  <div>
                    {user.verified_at ? (
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                        ✗ Unverified
                      </span>
                    )}
                  </div>
                </div>
                {user.verified_at && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 mb-1">Verified At</div>
                    <div className="text-gray-900">
                      {new Date(user.verified_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Preferences */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">User Preferences</h4>
              <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div>
                  <div className="text-sm text-purple-700 mb-1">Timezone</div>
                  <div className="font-medium text-gray-900">{user.timezone || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-sm text-purple-700 mb-1">Language</div>
                  <div className="font-medium text-gray-900">{user.language || 'Not set'}</div>
                </div>
              </div>
            </div>

            {/* Chat Integration */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Chat Integration</h4>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="text-sm text-indigo-700 mb-2">Connected Chat IDs</div>
                {user.chat_ids && user.chat_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.chat_ids.map((chatId: string, index: number) => (
                      <span key={index} className="inline-flex px-3 py-1 text-sm font-mono bg-white border border-indigo-300 text-indigo-900 rounded-full">
                        {chatId}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">No chat IDs connected</div>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h4>
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <div className="text-sm text-gray-600 mb-1">User ID</div>
                  <div className="font-mono text-xs text-gray-700 bg-white px-3 py-2 rounded border border-gray-300">
                    {user.id}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Created At</div>
                    <div className="text-gray-900">
                      {new Date(user.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Last Updated</div>
                    <div className="text-gray-900">
                      {new Date(user.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">Account Summary</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {user.verified_at ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-blue-700">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {user.chat_ids?.length || 0}
                  </div>
                  <div className="text-sm text-blue-700">Chat IDs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  </div>
                  <div className="text-sm text-blue-700">Days Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
