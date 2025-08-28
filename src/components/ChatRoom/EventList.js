import React, { useContext, useState } from 'react';
import { CalendarOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider.jsx';
import { AuthContext } from '../../Context/AuthProvider.jsx';
import { deleteEvent } from '../../firebase/services';
import useFirestore from '../../hooks/useFirestore';
import moment from 'moment';
import EventModal from '../Modals/EventModal.jsx';

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="m-0 inline-flex items-center text-base font-semibold"><CalendarOutlined className="mr-2" />Sự kiện phòng ({activeEvents.length})</h4>
        <button
          className="rounded-md bg-skybrand-600 px-3 py-2 text-xs font-medium text-white hover:bg-skybrand-700"
          onClick={() => { setEditingEvent(null); setEventModalVisible(true); }}
        >
          Tạo sự kiện
        </button>
      </div>

      {activeEvents.length === 0 ? (
        <div className="text-sm text-slate-500">Chưa có sự kiện nào trong phòng này</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {activeEvents.map((event) => {
            const eventTime = moment(event.datetime.toDate());
            const eventStatus = getEventStatus(eventTime);
            const canEdit = event.createdBy === user.uid;
            return (
              <li key={event.id} className="flex items-start py-2">
                <div className="mr-3 mt-1 inline-flex h-6 w-6 items-center justify-center rounded bg-skybrand-600 text-white"><CalendarOutlined /></div>
                <div className="flex-1">
                  <div className="mb-1 inline-flex items-center gap-2">
                    <span className="text-sm font-semibold">{event.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${eventStatus.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : eventStatus.status === 'ongoing' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{eventStatus.text}</span>
                  </div>
                  <div className="mb-1 text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                    <ClockCircleOutlined /> <span>{formatEventTime(event.datetime)}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                    <UserOutlined /> <span>{event.createdByName}</span>
                  </div>
                  {event.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">{event.description}</div>
                  )}
                </div>
                {canEdit && (
                  <div className="ml-3 inline-flex items-center gap-2">
                    <button
                      className="rounded border border-gray-300 p-1 text-xs dark:border-gray-700"
                      onClick={() => handleEditEvent(event)}
                      title="Chỉnh sửa"
                    >
                      <EditOutlined />
                    </button>
                    <button
                      className="rounded border border-rose-300 p-1 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      onClick={() => { if (window.confirm('Bạn có chắc chắn muốn xóa sự kiện này?')) handleDeleteEvent(event.id); }}
                      title="Xóa"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <EventModal
        visible={eventModalVisible}
        onCancel={() => { setEventModalVisible(false); setEditingEvent(null); }}
        initialData={editingEvent}
      />
    </div>
  );
}
