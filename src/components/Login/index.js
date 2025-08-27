import React, { useState } from 'react';
import { Row, Col, Button, Typography, Form, Input, Alert, Divider } from 'antd';
import { GoogleOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { generateKeywords, loginWithEmailAndPassword } from '../../firebase/services';
import Register from './Register';

const { Title, Text } = Typography;

const googleProvider = new GoogleAuthProvider();

export default function Login() {
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div>
      <Row justify='center' style={{ height: '100vh', alignItems: 'center' }}>
        <Col xs={20} sm={16} md={12} lg={8} xl={6}>
          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Title style={{ textAlign: 'center', marginBottom: 30 }} level={3}>
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
          </div>
        </Col>
      </Row>
    </div>
  );
}
