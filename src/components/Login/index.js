import React, { useState } from 'react';
import { Button, Typography, Form, Input, Alert, Divider } from 'antd';
import { GoogleOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { generateKeywords, loginWithEmailAndPassword } from '../../firebase/services';
import { useTheme } from '../../Context/ThemeProvider';
import styled from 'styled-components';
import Register from './Register';

const { Title, Text } = Typography;

const googleProvider = new GoogleAuthProvider();

const LoginContainerStyled = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.backgroundGradient};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const LoginCardStyled = styled.div`
  background: ${props => props.theme.colors.surfaceElevated};
  border-radius: 12px;
  box-shadow: ${props => props.theme.colors.shadowElevated};
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border: 1px solid ${props => props.theme.colors.borderLight};
  
  .login-title {
    color: ${props => props.theme.colors.primary} !important;
    text-align: center;
    margin-bottom: 30px;
    font-weight: bold;
  }
  
  .ant-form-item-label > label {
    color: ${props => props.theme.colors.text};
  }
  
  .ant-input, .ant-input-password {
    background: ${props => props.theme.colors.surface};
    border-color: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.text};
    
    &:focus, &:hover {
      border-color: ${props => props.theme.colors.primary};
    }
  }
  
  .ant-input-prefix {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

export default function Login() {
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await signInWithPopup(auth, googleProvider);
      const { user } = result;
      const additionalUserInfo = getAdditionalUserInfo(result);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User document doesn't exist, create it
        await setDoc(userDocRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          providerId: additionalUserInfo.providerId,
          keywords: [
            ...generateKeywords(user.displayName?.toLowerCase()),
            ...generateKeywords(user.email?.toLowerCase()),
          ],
        });
      }
    } catch (error) {
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (values) => {
    setLoading(true);
    setError('');
    
    const { email, password } = values;
    const { error: authError } = await loginWithEmailAndPassword(email, password);
    
    if (authError) {
      setError(getVietnameseErrorMessage(authError));
    }
    
    setLoading(false);
  };

  const getVietnameseErrorMessage = (errorMessage) => {
    if (errorMessage.includes('user-not-found')) {
      return 'Không tìm thấy tài khoản với email này.';
    }
    if (errorMessage.includes('wrong-password')) {
      return 'Mật khẩu không chính xác.';
    }
    if (errorMessage.includes('invalid-email')) {
      return 'Email không hợp lệ.';
    }
    if (errorMessage.includes('too-many-requests')) {
      return 'Quá nhiều lần thử. Vui lòng thử lại sau.';
    }
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  };

  if (showRegister) {
    return <Register onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return (
    <LoginContainerStyled theme={theme}>
      <LoginCardStyled theme={theme}>
        <Title className="login-title" level={3}>
          Đăng nhập SmurfChat
        </Title>
            
            {error && (
              <Alert
                message={error}
                type="error"
                style={{ marginBottom: 20 }}
                closable
                onClose={() => setError('')}
              />
            )}

            <Form
              name="login"
              onFinish={handleEmailLogin}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="Email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mật khẩu"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  Đăng nhập
                </Button>
              </Form.Item>
            </Form>

            <Divider>Hoặc</Divider>

            <Button
              icon={<GoogleOutlined />}
              onClick={handleGoogleLogin}
              loading={loading}
              style={{ width: '100%', marginBottom: 20 }}
            >
              Đăng nhập bằng Google
            </Button>

            <div style={{ textAlign: 'center' }}>
              <Text>
                Chưa có tài khoản?{' '}
                <Button type="link" onClick={() => setShowRegister(true)} style={{ padding: 0 }}>
                  Đăng ký ngay
                </Button>
              </Text>
            </div>
      </LoginCardStyled>
    </LoginContainerStyled>
  );
}
