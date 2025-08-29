import React, { useContext } from 'react';
import { CalendarOutlined } from '@ant-design/icons';
import { AppContext } from '../../Context/AppProvider';
import Calendar from '../Calendar/Calendar';

export default function CalendarModal() {
  const { isCalendarVisible, setIsCalendarVisible } = useContext(AppContext);

  if (!isCalendarVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-5">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsCalendarVisible(false)} />
      <div className="relative z-10 h-[90vh] w-[95vw] max-w-6xl overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center text-lg font-semibold"><span className="mr-2"><CalendarOutlined /></span>Lịch phòng</div>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsCalendarVisible(false)}>Đóng</button>
        </div>
        <div className="h-[calc(100%_-_40px)] overflow-auto">
          <Calendar />
        </div>
      </div>
    </div>
  );
}
