import React from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";

export default function EventMessage({ event, showActions = true }) {
  // Handle different datetime formats
  let eventTime;
  if (event.datetime) {
    if (event.datetime.toDate) {
      // Firestore Timestamp
      eventTime = event.datetime.toDate();
    } else if (event.datetime instanceof Date) {
      // JavaScript Date
      eventTime = event.datetime;
    } else if (typeof event.datetime === "string") {
      // String date
      eventTime = new Date(event.datetime);
    } else {
      // Fallback to current time if invalid
      eventTime = new Date();
    }
  } else {
    eventTime = new Date();
  }

  const getTimeDisplay = () => {
    if (isNaN(eventTime.getTime())) {
      return "Thời gian không hợp lệ";
    }

    if (isToday(eventTime)) {
      return `Hôm nay ${format(eventTime, "HH:mm")}`;
    } else if (isTomorrow(eventTime)) {
      return `Ngày mai ${format(eventTime, "HH:mm")}`;
    } else if (isYesterday(eventTime)) {
      return `Hôm qua ${format(eventTime, "HH:mm")}`;
    } else {
      return format(eventTime, "dd/MM/yyyy HH:mm");
    }
  };

  return (
    <div className="mx-auto my-3 max-w-[85%] rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm dark:border-emerald-800/40 dark:from-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CalendarOutlined className="text-lg" />
          </div>
          <div>
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              📅 Sự kiện
            </div>
            <h4 className="m-0 text-lg font-semibold text-slate-800 dark:text-slate-200">
              {event.title}
            </h4>
          </div>
        </div>
      </div>

      {/* Time Display */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-100/50 p-3 dark:bg-emerald-900/20">
        <ClockCircleOutlined className="text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium text-emerald-800 dark:text-emerald-300">
          {getTimeDisplay()}
        </span>
        {isToday(eventTime) && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Hôm nay
          </span>
        )}
        {isTomorrow(eventTime) && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Ngày mai
          </span>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="mb-3 rounded-lg bg-white/60 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          {event.description}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <UserOutlined />
          Tạo bởi {event.createdByName}
        </span>
        
        {showActions && (
          <div className="flex gap-2">
            <button
              className="rounded px-2 py-1 font-medium text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
              onClick={() => {
                const eventText = `📅 ${event.title}\n⏰ ${getTimeDisplay()}${event.description ? `\n📝 ${event.description}` : ''}`;
                navigator.clipboard.writeText(eventText);
              }}
              title="Sao chép thông tin sự kiện"
            >
              Sao chép
            </button>
            
            {/* Add to Calendar Button */}
            <button
              className="rounded px-2 py-1 font-medium text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
              onClick={() => {
                // Create calendar event URL
                const startTime = eventTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const endTime = new Date(eventTime.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}`;
                window.open(googleCalendarUrl, '_blank');
              }}
              title="Thêm vào Google Calendar"
            >
              📅 Lịch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
