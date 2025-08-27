import React, { useContext, useState } from 'react';
import { List, Avatar, Button, Popconfirm, Tag, Typography, Space, Tooltip } from 'antd';
import { CalendarOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
import { AuthContext } from '../../Context/AuthProvider';
import { deleteEvent } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';
import moment from 'moment';
import EventModal from '../Modals/EventModal';

const { Text } = Typography;

const EventListContainer = styled.div`
  .event-item {
    .ant-list-item-meta-title {
      margin-bottom: 4px;
    }
    
    .event-time {
      color: #1890ff;
      font-weight: 500;
    }
    
    .event-status {
      &.upcoming {
        color: #52c41a;
      }
      
      &.ongoing {
        color: #faad14;
      }
      
      &.past {
        color: #8c8c8c;
      }
    }
  }
`;

export default function EventList() {
  const { selectedRoom } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // Get events for the selected room
  const eventsCondition = React.useMemo(() => ({
    fieldName: 'roomId',
    operator: '==',
    compareValue: selectedRoom.id,
  }), [selectedRoom.id]);

  const events = useFirestore('events', eventsCondition);

  // Filter and sort events
  const activeEvents = events
    .filter(event => !event.deleted)
    .sort((a, b) => {
      const timeA = moment(a.datetime.toDate());
      const timeB = moment(b.datetime.toDate());
      return timeA.diff(timeB);
    });

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventModalVisible(true);
  };

  const getEventStatus = (eventTime) => {
    const now = moment();
    const event = moment(eventTime);
    const eventEnd = event.clone().add(1, 'hour'); // Assume 1 hour duration

    if (now.isBefore(event)) {
      return { status: 'upcoming', text: 'Sắp diễn ra', color: 'green' };
    } else if (now.isBetween(event, eventEnd)) {
      return { status: 'ongoing', text: 'Đang diễn ra', color: 'orange' };
    } else {
      return { status: 'past', text: 'Đã kết thúc', color: 'default' };
    }
  };

  const formatEventTime = (datetime) => {
    const eventTime = moment(datetime.toDate());
    const now = moment();
    
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
    <EventListContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          Sự kiện phòng ({activeEvents.length})
        </h4>
        <Button 
          type="primary" 
          size="small"
          icon={<CalendarOutlined />}
          onClick={() => {
            setEditingEvent(null);
            setEventModalVisible(true);
          }}
        >
          Tạo sự kiện
        </Button>
      </div>

      <List
        dataSource={activeEvents}
        renderItem={event => {
          const eventTime = moment(event.datetime.toDate());
          const eventStatus = getEventStatus(eventTime);
          const canEdit = event.createdBy === user.uid;

          return (
            <List.Item
              className="event-item"
              actions={canEdit ? [
                <Tooltip title="Chỉnh sửa">
                  <Button 
                    type="text" 
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEditEvent(event)}
                  />
                </Tooltip>,
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa sự kiện này?"
                  onConfirm={() => handleDeleteEvent(event.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Tooltip title="Xóa">
                    <Button 
                      type="text" 
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    />
                  </Tooltip>
                </Popconfirm>
              ] : []}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<CalendarOutlined />} size="small" />}
                title={
                  <Space>
                    <Text strong>{event.title}</Text>
                    <Tag color={eventStatus.color} size="small">
                      {eventStatus.text}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      <span className="event-time">
                        {formatEventTime(event.datetime)}
                      </span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <UserOutlined style={{ marginRight: 4 }} />
                      <Text type="secondary">{event.createdByName}</Text>
                    </div>
                    {event.description && (
                      <Text type="secondary">{event.description}</Text>
                    )}
                  </div>
                }
              />
            </List.Item>
          );
        }}
        locale={{
          emptyText: 'Chưa có sự kiện nào trong phòng này'
        }}
      />

      <EventModal
        visible={eventModalVisible}
        onCancel={() => {
          setEventModalVisible(false);
          setEditingEvent(null);
        }}
        initialData={editingEvent}
      />
    </EventListContainer>
  );
}
