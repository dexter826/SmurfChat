import React, { useState, useContext } from "react";
import { FaCalendar, FaClock } from "react-icons/fa";
import { AppContext } from "../../Context/AppProvider.jsx";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";
import { format, isSameDay } from "date-fns";
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
            <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedDateEvents.map((event) => (
                <li key={event.id} className="py-2">
                  <div className="text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                    <FaClock />{" "}
                    {format(
                      event.datetime.toDate
                        ? event.datetime.toDate()
                        : new Date(event.datetime),
                      "HH:mm"
                    )}
                  </div>
                  {event.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {event.description}
                    </div>
                  )}
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
