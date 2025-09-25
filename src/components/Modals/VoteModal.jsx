import React, { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { createVote } from "../../firebase/services";
import { useContext } from "react";
import { AuthContext } from "../../Context/AuthProvider";
import { AppContext } from "../../Context/AppProvider";
import { useAlert } from "../../Context/AlertProvider";

const VoteModal = () => {
  const { isVoteModalVisible, setIsVoteModalVisible } = useContext(AppContext);
  const { warning, error, success } = useAlert();
  const [form, setForm] = useState({ title: "" });
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  const {
    user: { uid, displayName },
  } = useContext(AuthContext);
  const { selectedRoom } = useContext(AppContext);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    } else {
      warning("Tối đa 10 lựa chọn");
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    } else {
      warning("Cần ít nhất 2 lựa chọn");
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate form
      if (!form.title || form.title.trim().length < 3) {
        warning("Tiêu đề vote phải có ít nhất 3 ký tự");
        setLoading(false);
        return;
      }

      // Filter out empty options
      const validOptions = options.filter((option) => option.trim() !== "");

      if (validOptions.length < 2) {
        warning("Cần ít nhất 2 lựa chọn hợp lệ");
        setLoading(false);
        return;
      }

      const voteData = {
        title: form.title,
        options: validOptions,
        roomId: selectedRoom.id,
        createdBy: uid,
        creatorName: displayName,
      };

      await createVote(voteData);
      success("Tạo vote thành công!");

      // Reset form and close modal
      setForm({ title: "" });
      setOptions(["", ""]);
      setIsVoteModalVisible(false);
    } catch (err) {
      console.error("Error creating vote:", err);
      error("Có lỗi xảy ra khi tạo vote");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({ title: "" });
    setOptions(["", ""]);
    setIsVoteModalVisible(false);
  };

  if (!isVoteModalVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tạo Vote Mới</h3>
          <button
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleCancel}
          >
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tiêu đề vote
            </label>
            <input
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
              placeholder="Ví dụ: Chọn địa điểm họp nhóm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Các lựa chọn
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
                    placeholder={`Lựa chọn ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <button
                      className="rounded-md border border-rose-300 p-2 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      onClick={() => handleRemoveOption(index)}
                      title="Xóa"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                className="mt-3 w-full rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                onClick={handleAddOption}
                title="Thêm lựa chọn"
              >
                <span className="inline-flex items-center gap-1">
                  <FaPlus /> Thêm lựa chọn
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            onClick={handleCancel}
          >
            Hủy
          </button>
          <button
            className="rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700"
            onClick={handleSubmit}
            disabled={loading}
          >
            Tạo Vote
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteModal;
