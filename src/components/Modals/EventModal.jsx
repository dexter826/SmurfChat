import React, { useState, useContext, useEffect } from "react";
import { CalendarOutlined } from "@ant-design/icons";
import { AppContext } from "../../Context/AppProvider.jsx";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import { createEvent } from "../../firebase/services";
import moment from "moment";

export default function EventModal({ visible, onCancel, initialData = null }) {
  const { selectedRoom, members } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const { warning, success, error } = useAlert();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: moment().format("YYYY-MM-DD"),
    time: moment().format("HH:mm"),
    participants: [],
    reminderMinutes: 15,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || "",
        description: initialData.description || "",
        date: moment(initialData.datetime).format("YYYY-MM-DD"),
        time: moment(initialData.datetime).format("HH:mm"),
        participants: initialData.participants || [],
        reminderMinutes: initialData.reminderMinutes ?? 15,
      });
    } else {
      setForm((f) => ({ ...f, participants: selectedRoom.members || [] }));
    }
  }, [initialData, selectedRoom.members]);

  const reminderOptions = [
    { value: 5, label: "5 phút trước" },
    { value: 15, label: "15 phút trước" },
    { value: 30, label: "30 phút trước" },
    { value: 60, label: "1 giờ trước" },
    { value: 1440, label: "1 ngày trước" },
  ];

  const handleSubmit = async () => {
    if (!form.title || form.title.trim().length < 3) {
      warning("Tiêu đề sự kiện phải có ít nhất 3 ký tự!");
      return;
    }
    if (!form.date || !form.time) {
      warning("Vui lòng chọn ngày/giờ!");
      return;
    }
    
    // Validate date is not in the past
    const eventDateTime = moment(`${form.date} ${form.time}`);
    if (eventDateTime.isBefore(moment())) {
      warning("Không thể tạo sự kiện trong quá khứ!");
      return;
    }

    setLoading(true);
    try {
      const eventDateTime = moment(
        `${form.date} ${form.time}`,
        "YYYY-MM-DD HH:mm"
      ).toDate();
      const eventData = {
        title: form.title,
        description: form.description || "",
        datetime: eventDateTime,
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        createdBy: user.uid,
        createdByName: user.displayName,
        participants:
          form.participants && form.participants.length > 0
            ? form.participants
            : selectedRoom.members,
        reminderMinutes: form.reminderMinutes || 15,
        status: "active",
        type: "meeting",
      };

      await createEvent(eventData);
      success("Sự kiện đã được tạo thành công!");
      onCancel();
    } catch (err) {
      console.error("Error creating event:", err);
      error("Có lỗi xảy ra khi tạo sự kiện!");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="inline-flex items-center text-lg font-semibold">
            <CalendarOutlined className="mr-2" />
            {initialData ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
          </h3>
          <button
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onCancel}
          >
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tiêu đề sự kiện
            </label>
            <input
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
              placeholder="Ví dụ: Họp nhóm thảo luận đề tài"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mô tả</label>
            <textarea
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
              rows={3}
              placeholder="Mô tả chi tiết về sự kiện (tùy chọn)"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Ngày</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Giờ</label>
              <input
                type="time"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Thành viên tham gia
            </label>
            <div className="rounded border border-gray-300 p-2 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const checked = form.participants.includes(member.uid);
                  return (
                    <label
                      key={member.uid}
                      className="inline-flex items-center gap-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="accent-skybrand-600"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.participants, member.uid]
                            : form.participants.filter(
                                (id) => id !== member.uid
                              );
                          setForm({ ...form, participants: next });
                        }}
                      />
                      <span>{member.displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nhắc nhở trước
            </label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              value={form.reminderMinutes}
              onChange={(e) =>
                setForm({ ...form, reminderMinutes: Number(e.target.value) })
              }
            >
              {reminderOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            className="mr-2 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            className="rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700"
            onClick={handleSubmit}
            disabled={loading}
          >
            {initialData ? "Cập nhật" : "Tạo sự kiện"}
          </button>
        </div>
      </div>
    </div>
  );
}
