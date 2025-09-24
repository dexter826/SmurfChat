import React, { useState, useContext } from "react";
import {
  FaCalendar,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { AppContext } from "../../Context/AppProvider.jsx";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";
import { format, isSameDay, isBefore } from "date-fns";
import EventModal from "../Modals/EventModal.jsx";

export default function Calendar() {
  const { selectedRoom } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // Lấy danh sách sự kiện cho phòng được chọn
  const eventsCondition = React.useMemo(
    () => ({
      fieldName: "roomId",
      operator: "==",
      compareValue: selectedRoom.id,
    }),
    [selectedRoom.id]
  );

  const { documents: events } = useOptimizedFirestore(
    "events",
    eventsCondition
  );

  const getEventsForDate = (date) => {
    return events.filter((event) => {
      const eventDate = event.datetime.toDate
        ? event.datetime.toDate()
        : new Date(event.datetime);
      return isSameDay(eventDate, date);
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  // Helper function để lấy màu sắc cho sự kiện
  const getEventColor = (event) => {
    const now = new Date();
    const eventTime = event.datetime.toDate
      ? event.datetime.toDate()
      : new Date(event.datetime);

    // Ưu tiên trạng thái trước
    if (event.status === "completed")
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700";
    if (event.status === "cancelled")
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700";

    // Sự kiện trong quá khứ
    if (isBefore(eventTime, now))
      return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600";

    // Sự kiện sắp diễn ra - màu theo category
    const categoryColors = {
      meeting:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
      work: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
      personal:
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
      reminder:
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700",
      other:
        "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700",
    };

    return (
      categoryColors[event.category || "meeting"] || categoryColors.meeting
    );
  };

  // Helper function để lấy icon cho trạng thái sự kiện
  const getEventStatusIcon = (event) => {
    const now = new Date();
    const eventTime = event.datetime.toDate
      ? event.datetime.toDate()
      : new Date(event.datetime);

    if (event.status === "completed")
      return <FaCheckCircle className="text-green-600" />;
    if (event.status === "cancelled")
      return <FaTimesCircle className="text-red-600" />;
    if (isBefore(eventTime, now))
      return <FaExclamationCircle className="text-gray-500" />;

    return <FaClock className="text-blue-600" />;
  };

  // Helper function để format trạng thái sự kiện
  const getEventStatusText = (event) => {
    const now = new Date();
    const eventTime = event.datetime.toDate
      ? event.datetime.toDate()
      : new Date(event.datetime);

    if (event.status === "completed") return "Hoàn thành";
    if (event.status === "cancelled") return "Đã hủy";
    if (isBefore(eventTime, now)) return "Đã qua";

    return "Sắp diễn ra";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="m-0 inline-flex items-center text-lg font-semibold">
          <FaCalendar className="mr-2" />
          Lịch phòng: {selectedRoom.name}
        </h3>
        <button
          className="rounded-md bg-skybrand-600 px-3 py-2 text-sm font-medium text-white hover:bg-skybrand-700"
          onClick={() => setEventModalVisible(true)}
        >
          Tạo sự kiện
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col rounded border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            Chọn ngày
          </div>
          <input
            type="date"
            className="w-fit rounded border border-gray-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
          />
        </div>
        <div className="w-1/3 rounded border border-gray-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-slate-800">
          <h4 className="m-0 text-sm font-semibold">
            Sự kiện ngày {format(selectedDate, "dd/MM/yyyy")}
          </h4>
          {selectedDateEvents.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {selectedDateEvents.map((event) => (
                <li
                  key={event.id}
                  className={`p-3 rounded-lg border ${getEventColor(event)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventStatusIcon(event)}
                        <span className="text-sm font-semibold">
                          {event.title}
                        </span>
                      </div>
                      <div className="text-xs opacity-80 mb-1">
                        {format(
                          event.datetime.toDate
                            ? event.datetime.toDate()
                            : new Date(event.datetime),
                          "HH:mm"
                        )}
                      </div>
                      {event.description && (
                        <div className="text-xs opacity-75 line-clamp-2">
                          {event.description}
                        </div>
                      )}
                    </div>
                    <div className="text-xs opacity-60">
                      {getEventStatusText(event)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              Không có sự kiện nào trong ngày này
            </div>
          )}
        </div>
      </div>

      <EventModal
        visible={eventModalVisible}
        onCancel={() => setEventModalVisible(false)}
      />
    </div>
  );
}
