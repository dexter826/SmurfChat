import React from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import moment from "moment";

export default function EventMessage({ event, showActions = true }) {
  // Handle different datetime formats
  let eventTime;
  if (event.datetime) {
    if (event.datetime.toDate) {
      // Firestore Timestamp
      eventTime = moment(event.datetime.toDate());
    } else if (event.datetime instanceof Date) {
      // JavaScript Date
      eventTime = moment(event.datetime);
    } else if (typeof event.datetime === "string") {
      // String date
      eventTime = moment(event.datetime);
    } else {
      // Fallback to current time if invalid
      eventTime = moment();
    }
  } else {
    eventTime = moment();
  }

  const now = moment();

  const getTimeDisplay = () => {
    if (!eventTime.isValid()) {
      return "Thời gian không hợp lệ";
    }

    if (eventTime.isSame(now, "day")) {
      return `Hôm nay ${eventTime.format("HH:mm")}`;
    } else if (eventTime.isSame(now.clone().add(1, "day"), "day")) {
      return `Ngày mai ${eventTime.format("HH:mm")}`;
    } else if (eventTime.isSame(now.clone().subtract(1, "day"), "day")) {
      return `Hôm qua ${eventTime.format("HH:mm")}`;
    } else {
      return eventTime.format("DD/MM/YYYY HH:mm");
    }
  };

  return (
    <div className="mx-auto my-2 block max-w-[60%] rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100 p-4 shadow-sm dark:border-skybrand-700/40 dark:from-slate-800 dark:to-slate-900">
      <div className="mb-2 flex items-center">
        <div className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-skybrand-600 text-white">
          <CalendarOutlined />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-skybrand-700 dark:text-skybrand-300">
            <span className="inline-flex items-center gap-1">
              <CalendarOutlined /> Sự kiện
            </span>
          </div>
          <h4 className="m-0 text-base font-semibold text-skybrand-700 dark:text-skybrand-300">
            {event.title}
          </h4>
          <div className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <span className="inline-flex items-center">
              <ClockCircleOutlined className="mr-1" />
              {getTimeDisplay()}
            </span>
          </div>
        </div>
      </div>

      {event.description && (
        <div className="mb-2 text-[13px] text-slate-600 dark:text-slate-300">
          {event.description}
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center">
          <UserOutlined className="mr-1" />
          Được tạo bởi {event.createdByName}
        </span>
      </div>

      {showActions && (
        <div className="mt-2 text-right">
          <button
            className="text-xs font-medium text-skybrand-700 hover:underline dark:text-skybrand-300"
            onClick={() =>
              navigator.clipboard.writeText(
                `${event.title} - ${getTimeDisplay()}`
              )
            }
          >
            Sao chép
          </button>
        </div>
      )}
    </div>
  );
}
