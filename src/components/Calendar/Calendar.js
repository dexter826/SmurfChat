import React, { useState, useContext } from 'react';
import { Calendar as AntCalendar, Badge, List, Avatar, Button, Popover, Typography } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { AppContext } from '../../Context/AppProvider';
// import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';
import moment from 'moment';
import EventModal from '../Modals/EventModal';

const { Text } = Typography;

const CalendarContainer = styled.div`
  .ant-picker-calendar {
    .ant-picker-panel {
      background: white;
    }
    
    .ant-picker-calendar-date-today {
      border-color: #1890ff;
    }
  }
`;

const EventItem = styled.div`
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  background: ${props => props.type === 'meeting' ? '#e6f7ff' : '#f6ffed'};
  border-left: 3px solid ${props => props.type === 'meeting' ? '#1890ff' : '#52c41a'};
  cursor: pointer;
  font-size: 12px;
  
  &:hover {
    opacity: 0.8;
  }
`;

const EventPopoverContent = styled.div`
  max-width: 300px;
  
  .event-title {
    font-weight: bold;
    margin-bottom: 8px;
  }
  
  .event-detail {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 12px;
    color: #666;
    
    .anticon {
      margin-right: 4px;
    }
  }
`;

export default function Calendar() {
  const { selectedRoom } = useContext(AppContext);
  // const {
  //   user: { uid },
  // } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // Get events for the selected room
  const eventsCondition = React.useMemo(() => ({
    fieldName: 'roomId',
    operator: '==',
    compareValue: selectedRoom.id,
  }), [selectedRoom.id]);

  const events = useFirestore('events', eventsCondition);

  // Filter active events
  const activeEvents = events.filter(event => !event.deleted);

  const getEventsForDate = (date) => {
    return activeEvents.filter(event => {
      const eventDate = moment(event.datetime.toDate());
      return eventDate.format('YYYY-MM-DD') === date.format('YYYY-MM-DD');
    });
  };

  const dateCellRender = (value) => {
    const dayEvents = getEventsForDate(value);
    
    return (
      <div>
        {dayEvents.slice(0, 2).map(event => (
          <Popover
            key={event.id}
            content={
              <EventPopoverContent>
                <div className="event-title">{event.title}</div>
                <div className="event-detail">
                  <ClockCircleOutlined />
                  {moment(event.datetime.toDate()).format('HH:mm')}
                </div>
                <div className="event-detail">
                  <UserOutlined />
                  {event.createdByName}
                </div>
                {event.description && (
                  <div className="event-detail">
                    {event.description}
                  </div>
                )}
              </EventPopoverContent>
            }
            title="Chi tiết sự kiện"
          >
            <EventItem type={event.type}>
              {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
            </EventItem>
          </Popover>
        ))}
        {dayEvents.length > 2 && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            +{dayEvents.length - 2} sự kiện khác
          </Text>
        )}
      </div>
    );
  };

  const monthCellRender = (value) => {
    const monthEvents = activeEvents.filter(event => {
      const eventDate = moment(event.datetime.toDate());
      return eventDate.format('YYYY-MM') === value.format('YYYY-MM');
    });

    return monthEvents.length ? (
      <div>
        <Badge count={monthEvents.length} style={{ backgroundColor: '#52c41a' }} />
      </div>
    ) : null;
  };

  const onDateSelect = (date) => {
    setSelectedDate(date);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <CalendarContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          Lịch phòng: {selectedRoom.name}
        </h3>
        <Button 
          type="primary" 
          icon={<CalendarOutlined />}
          onClick={() => setEventModalVisible(true)}
        >
          Tạo sự kiện
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2 }}>
          <AntCalendar
            dateCellRender={dateCellRender}
            monthCellRender={monthCellRender}
            onSelect={onDateSelect}
            value={selectedDate}
          />
        </div>
        
        <div style={{ flex: 1, background: '#fafafa', padding: 16, borderRadius: 6 }}>
          <h4>Sự kiện ngày {selectedDate.format('DD/MM/YYYY')}</h4>
          {selectedDateEvents.length > 0 ? (
            <List
              dataSource={selectedDateEvents}
              renderItem={event => (
                <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<CalendarOutlined />} size="small" />}
                    title={
                      <div>
                        <Text strong>{event.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {moment(event.datetime.toDate()).format('HH:mm')}
                        </Text>
                      </div>
                    }
                    description={event.description}
                  />
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">Không có sự kiện nào trong ngày này</Text>
          )}
        </div>
      </div>

      <EventModal
        visible={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
      />
    </CalendarContainer>
  );
}
