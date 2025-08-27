import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createVote } from '../../firebase/services';
import { useContext } from 'react';
import { AuthContext } from '../../Context/AuthProvider';
import { AppContext } from '../../Context/AppProvider';

const VoteModal = () => {
  const { isVoteModalVisible, setIsVoteModalVisible } = useContext(AppContext);
  const [form] = Form.useForm();
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  
  const { user: { uid, displayName } } = useContext(AuthContext);
  const { selectedRoom } = useContext(AppContext);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    } else {
      message.warning('Tối đa 10 lựa chọn');
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    } else {
      message.warning('Cần ít nhất 2 lựa chọn');
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Filter out empty options
      const validOptions = options.filter(option => option.trim() !== '');
      
      if (validOptions.length < 2) {
        message.error('Cần ít nhất 2 lựa chọn hợp lệ');
        return;
      }

      const voteData = {
        title: values.title,
        description: values.description || '',
        options: validOptions,
        roomId: selectedRoom.id,
        createdBy: uid,
        creatorName: displayName,
        allowMultiple: false, // For now, single choice only
        anonymous: false, // For now, non-anonymous
      };

      await createVote(voteData);
      message.success('Tạo vote thành công!');
      
      // Reset form and close modal
      form.resetFields();
      setOptions(['', '']);
      setIsVoteModalVisible(false);
      
    } catch (error) {
      console.error('Error creating vote:', error);
      message.error('Có lỗi xảy ra khi tạo vote');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setOptions(['', '']);
    setIsVoteModalVisible(false);
  };

  return (
    <Modal
      title="Tạo Vote Mới"
      open={isVoteModalVisible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="title"
          label="Tiêu đề vote"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề vote' }]}
        >
          <Input placeholder="Ví dụ: Chọn địa điểm họp nhóm" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả (tùy chọn)"
        >
          <Input.TextArea 
            placeholder="Mô tả chi tiết về vote này..."
            rows={3}
          />
        </Form.Item>

        <Form.Item label="Các lựa chọn">
          <Space direction="vertical" style={{ width: '100%' }}>
            {options.map((option, index) => (
              <Space key={index} style={{ width: '100%' }}>
                <Input
                  placeholder={`Lựa chọn ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  style={{ flex: 1 }}
                />
                {options.length > 2 && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveOption(index)}
                  />
                )}
              </Space>
            ))}
            
            {options.length < 10 && (
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddOption}
                style={{ width: '100%' }}
              >
                Thêm lựa chọn
              </Button>
            )}
          </Space>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={loading}
            >
              Tạo Vote
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VoteModal;
