import React, { useState, useContext } from 'react';
import { Modal, Form, Input, DatePicker, TimePicker, Select, Button, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { createEvent } from '../../firebase/services';
import moment from 'moment';

const { Option } = Select;
const { TextArea } = Input;

export default function EventModal({ visible, onCancel, initialData = null }) {
  const { selectedRoom, members } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const eventDateTime = moment(values.date)
        .hour(values.time.hour())
        .minute(values.time.minute())
        .toDate();

      const eventData = {
        title: values.title,
        description: values.description || '',
        datetime: eventDateTime,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        createdBy: user.uid,
        createdByName: user.displayName,
        participants: values.participants || selectedRoom.members,
        reminderMinutes: values.reminderMinutes || 15,
        status: 'active',
        type: 'meeting'
      };

      await createEvent(eventData);
      message.success('Sự kiện đã được tạo thành công!');
      form.resetFields();
      onCancel();
    } catch (error) {
      console.error('Error creating event:', error);
      message.error('Có lỗi xảy ra khi tạo sự kiện!');
    } finally {
      setLoading(false);
    }
  };

  const reminderOptions = [
    { value: 5, label: '5 phút trước' },
    { value: 15, label: '15 phút trước' },
    { value: 30, label: '30 phút trước' },
    { value: 60, label: '1 giờ trước' },
    { value: 1440, label: '1 ngày trước' },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          {initialData ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialData ? {
          title: initialData.title,
          description: initialData.description,
          date: moment(initialData.datetime),
          time: moment(initialData.datetime),
          participants: initialData.participants,
          reminderMinutes: initialData.reminderMinutes
        } : {
          reminderMinutes: 15
        }}
      >
        <Form.Item
          name="title"
          label="Tiêu đề sự kiện"
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề sự kiện!' }]}
        >
          <Input placeholder="Ví dụ: Họp nhóm thảo luận đề tài" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Mô tả"
        >
          <TextArea 
            rows={3} 
            placeholder="Mô tả chi tiết về sự kiện (tùy chọn)" 
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item
            name="date"
            label="Ngày"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày"
            />
          </Form.Item>

          <Form.Item
            name="time"
            label="Giờ"
            style={{ flex: 1 }}
            rules={[{ required: true, message: 'Vui lòng chọn giờ!' }]}
          >
            <TimePicker 
              style={{ width: '100%' }}
              format="HH:mm"
              placeholder="Chọn giờ"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="participants"
          label="Thành viên tham gia"
        >
          <Select
            mode="multiple"
            placeholder="Chọn thành viên (mặc định: tất cả thành viên phòng)"
            style={{ width: '100%' }}
          >
            {members.map(member => (
              <Option key={member.uid} value={member.uid}>
                {member.displayName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="reminderMinutes"
          label="Nhắc nhở trước"
        >
          <Select placeholder="Chọn thời gian nhắc nhở">
            {reminderOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialData ? 'Cập nhật' : 'Tạo sự kiện'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
