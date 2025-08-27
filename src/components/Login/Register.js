import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Divider } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { registerWithEmailAndPassword } from '../../firebase/services';
import { useTheme } from '../../Context/ThemeProvider';
import styled from 'styled-components';

const { Title, Text } = Typography;

const RegisterContainerStyled = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.backgroundGradient};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const RegisterCardStyled = styled.div`
  background: ${props => props.theme.colors.surfaceElevated};
  border-radius: 12px;
  box-shadow: ${props => props.theme.colors.shadowElevated};
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border: 1px solid ${props => props.theme.colors.borderLight};
  
  .register-title {
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

export default function Register({ onSwitchToLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    const { email, password, displayName } = values;
    const { error: authError } = await registerWithEmailAndPassword(email, password, displayName);
    
    if (authError) {
      setError(getVietnameseErrorMessage(authError));
    }
    
    setLoading(false);
  };

  const getVietnameseErrorMessage = (errorMessage) => {
    if (errorMessage.includes('email-already-in-use')) {
      return 'Email này đã được sử dụng. Vui lòng chọn email khác.';
    }
    if (errorMessage.includes('weak-password')) {
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    }
    if (errorMessage.includes('invalid-email')) {
      return 'Email không hợp lệ.';
    }
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  };

  return (
    <RegisterContainerStyled theme={theme}>
      <RegisterCardStyled theme={theme}>
        <Title className="register-title" level={3}>
          Đăng ký tài khoản
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
        name="register"
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="displayName"
          rules={[
            { required: true, message: 'Vui lòng nhập tên hiển thị!' },
            { min: 2, message: 'Tên hiển thị phải có ít nhất 2 ký tự!' }
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Tên hiển thị"
          />
        </Form.Item>

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
            { required: true, message: 'Vui lòng nhập mật khẩu!' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Mật khẩu"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Xác nhận mật khẩu"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ width: '100%' }}
          >
            Đăng ký
          </Button>
        </Form.Item>
      </Form>

      <Divider />
      
      <div style={{ textAlign: 'center' }}>
        <Text>
          Đã có tài khoản?{' '}
          <Button type="link" onClick={onSwitchToLogin} style={{ padding: 0 }}>
            Đăng nhập ngay
          </Button>
        </Text>
      </div>
      </RegisterCardStyled>
    </RegisterContainerStyled>
  );
}
