import React, { useState, useContext } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { AppContext } from "../../Context/AppProvider.jsx";
// import { AuthContext } from '../../Context/AuthProvider.jsx';
import useFirestore from "../../hooks/useFirestore";
import moment from "moment";
import EventModal from "../Modals/EventModal.jsx";

export default function Calendar() {
  const { selectedRoom } = useContext(AppContext);
  // const {
  //   user: { uid },
  // } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [eventModalVisible, setEventModalVisible] = useState(false);

  // Get events for the selected room
  const eventsCondition = React.useMemo(
    () => ({
      fieldName: "roomId",
      operator: "==",
      compareValue: selectedRoom.id,
    }),
    [selectedRoom.id]
  );

  const events = useFirestore("events", eventsCondition);

  // Filter active events
  const activeEvents = events.filter((event) => !event.deleted);

  const getEventsForDate = (date) => {
    return activeEvents.filter((event) => {
      const eventDate = moment(event.datetime.toDate());
      return eventDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD");
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="m-0 inline-flex items-center text-lg font-semibold">
          <CalendarOutlined className="mr-2" />
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
            value={selectedDate.format("YYYY-MM-DD")}
            onChange={(e) => setSelectedDate(moment(e.target.value))}
          />
        </div>
        <div className="w-1/3 rounded border border-gray-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-slate-800">
          <h4 className="m-0 text-sm font-semibold">
            Sự kiện ngày {selectedDate.format("DD/MM/YYYY")}
          </h4>
          {selectedDateEvents.length > 0 ? (
            <ul className="mt-2 divide-y divide-gray-200 dark:divide-gray-700">
              {selectedDateEvents.map((event) => (
                <li key={event.id} className="py-2">
                  <div className="text-sm font-medium">{event.title}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                    <ClockCircleOutlined />{" "}
                    {moment(event.datetime.toDate()).format("HH:mm")}
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
