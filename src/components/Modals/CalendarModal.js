import React, { useContext } from 'react';
import { Modal } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider';
import Calendar from '../Calendar/Calendar';

export default function CalendarModal() {
  const { isCalendarVisible, setIsCalendarVisible } = useContext(AppContext);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          Lịch phòng
        </div>
      }
      open={isCalendarVisible}
      onCancel={() => setIsCalendarVisible(false)}
      footer={null}
      width={1200}
      style={{ top: 20 }}
    >
      <Calendar />
    </Modal>
  );
}
