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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiService.login(phoneNumber, verificationCode);

      if (response.success && response.data) {
        // Store authentication tokens
        apiService.setTokens({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        });

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
          <form onSubmit={handleSubmit} className="space-y-6">
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
            />

            <Input
              label="Verification Code"
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              disabled={loading}
            />

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

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
