import React from 'react';
import { Card, Button, Avatar, Space, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import moment from 'moment';

const { Text } = Typography;

const EventMessageCard = styled(Card)`
  margin: 8px auto;
  border-radius: 12px;
  border: 1px solid #e6f7ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
  max-width: 60%;
  display: block;
  
  .ant-card-body {
    padding: 12px 16px;
  }
  
  .event-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .event-title {
    font-weight: 600;
    color: #1890ff;
    margin: 0 0 4px 0;
  }
  
  .event-time {
    color: #52c41a;
    font-weight: 500;
  }
  
  .event-creator {
    color: #666;
    font-size: 12px;
  }
  
  .event-actions {
    margin-top: 8px;
    text-align: right;
  }
`;

const EventIcon = styled(Avatar)`
  background: #1890ff;
  margin-right: 8px;
`;

export default function EventMessage({ event, showActions = true }) {
  const eventTime = moment(event.datetime);
  const now = moment();
  
  const getTimeDisplay = () => {
    if (eventTime.isSame(now, 'day')) {
      return `Hôm nay ${eventTime.format('HH:mm')}`;
    } else if (eventTime.isSame(now.clone().add(1, 'day'), 'day')) {
      return `Ngày mai ${eventTime.format('HH:mm')}`;
    } else if (eventTime.isSame(now.clone().subtract(1, 'day'), 'day')) {
      return `Hôm qua ${eventTime.format('HH:mm')}`;
    } else {
      return eventTime.format('DD/MM/YYYY HH:mm');
    }
  };


  return (
    <EventMessageCard size="small">
      <div className="event-header">
        <EventIcon icon={<CalendarOutlined />} size="small" />
        <div style={{ flex: 1 }}>
          <div className="event-status">
            <Text type="primary">
              <CalendarOutlined /> Sự kiện
            </Text>
          </div>
          <h4 className="event-title">{event.title}</h4>
          <Space size="small">
            <Text className="event-time">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {getTimeDisplay()}
            </Text>
          </Space>
        </div>
      </div>
      
      {event.description && (
        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: 8 }}>
          {event.description}
        </Text>
      )}
      
      <div className="event-creator">
        <UserOutlined style={{ marginRight: 4 }} />
        Được tạo bởi {event.createdByName}
      </div>
      
      {showActions && (
        <div className="event-actions">
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              // Add to calendar functionality could be added here
              navigator.clipboard.writeText(`${event.title} - ${getTimeDisplay()}`);
            }}
          >
            Sao chép
          </Button>
        </div>
      )}
    </EventMessageCard>
  );
}
