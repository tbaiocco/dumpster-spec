import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

/**
 * Login Page for User Frontend
 * Phone-based authentication with verification code
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, sendCode, error, clearError } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      const success = await sendCode(phoneNumber);
      
      if (success) {
        setCodeSent(true);
        console.log('Verification code sent! Check the backend console for the code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      const success = await login(phoneNumber, verificationCode);
      
      if (success) {
        console.log('Login successful, redirecting to dashboard...');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-bold bg-gradient-primary bg-clip-text text-transparent">
            Clutter.AI
          </h1>
          <p className="mt-2 text-slate-600 font-body">
            Your Universal Life Inbox
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              {codeSent ? 'Enter Verification Code' : 'Sign In'}
            </CardTitle>
            <CardDescription>
              {codeSent
                ? 'Check the backend console for your verification code'
                : 'Enter your phone number to receive a verification code'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-charming bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {!codeSent ? (
              <form onSubmit={handleSendCode} className="space-y-6">
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  helperText="Enter your phone number in international format (e.g., +1234567890)"
                />

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-charming bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800">
                    Verification code sent to <strong>{phoneNumber}</strong>
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
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl tracking-widest font-mono"
                />

                <div className="space-y-3">
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setCodeSent(false);
                      setVerificationCode('');
                      clearError();
                    }}
                    disabled={loading}
                    className="w-full"
                  >
                    Change Number
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Secure authentication powered by Clutter.AI
        </p>
      </div>
    </div>
  );
};
