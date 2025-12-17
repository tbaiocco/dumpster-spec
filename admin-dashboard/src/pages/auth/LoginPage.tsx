import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import apiService from '../../services/api.service';

/**
 * Login Page
 * Admin authentication with phone number and verification code
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.sendVerificationCode(phoneNumber);

      if (response.success) {
        setCodeSent(true);
        setError(''); // Clear any previous errors
        console.log('Verification code sent! Check the backend console for the code.');
      } else {
        setError(response.error?.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.login(phoneNumber, verificationCode);
      console.log('Login response:', response);

      if (response.success && response.data) {
        console.log('Access token:', response.data.access_token);
        
        // Store authentication tokens and user data
        apiService.setTokens({
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        }, response.data.user);

        console.log('Tokens and user data stored, navigating to dashboard...');
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your phone number and verification code to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
                helperText="Enter your phone number in international format (e.g., +1234567890)"
              />

              <Button type="submit" className="w-full" loading={loading}>
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  Verification code sent to {phoneNumber}
                  <br />
                  <strong>Development Mode:</strong> Check the backend console for the code.
                </p>
              </div>

              <Input
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                disabled
              />

              <Input
                label="Verification Code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCodeSent(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Change Number
                </Button>
                <Button type="submit" className="flex-1" loading={loading}>
                  Sign In
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <p className="text-center text-sm text-gray-500">
              Need access? Contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
