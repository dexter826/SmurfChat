import React, { useState, useContext } from "react";
import { CameraOutlined } from "@ant-design/icons";
import { AppContext } from "../../Context/AppProvider";
import { AuthContext } from "../../Context/AuthProvider";
import { useAlert } from "../../Context/AlertProvider";
import {
  updateRoomAvatar,
  dissolveRoom,
  leaveRoom,
  transferRoomAdmin,
  uploadImage,
} from "../../firebase/services";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

export default function RoomInfoModal({ visible, onClose, room }) {
  const { members, clearState } = useContext(AppContext);
  const { user } = useContext(AuthContext);
  const { success, error, confirm } = useAlert();
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [showAdminSelection, setShowAdminSelection] = useState(false);

  const isAdmin = room?.admin === user?.uid;
  const isCurrentUserAdmin = room?.admin === user?.uid;

  const handleAvatarUpload = async (file) => {
    try {
      // Upload image to Firebase Storage
      const uploadResult = await uploadImage(file, user.uid);
      await updateRoomAvatar(room.id, uploadResult.url);
      success("Đã cập nhật avatar nhóm!");
    } catch (error) {
      console.error("Lỗi khi upload avatar:", error);
      error("Không thể cập nhật avatar nhóm");
    }
  };

  const handleRemoveMember = async (memberIdToRemove) => {
    if (room.id) {
      const roomRef = doc(db, "rooms", room.id);
      const updatedMembers =
        room?.members?.filter((memberUid) => memberUid !== memberIdToRemove) ||
        [];

      await updateDoc(roomRef, {
        members: updatedMembers,
      });

      success("Đã xóa thành viên khỏi nhóm!");
    }
  };

  const handleDissolveRoom = async () => {
    try {
      await dissolveRoom(room.id);
      success("Nhóm đã được giải tán thành công!");
      onClose();
      clearState();
    } catch (error) {
      console.error("Error dissolving room:", error);
      error("Có lỗi xảy ra khi giải tán nhóm!");
    }
  };

  const handleLeaveRoom = async () => {
    try {
      if (isCurrentUserAdmin && room?.members?.length > 1) {
        // Quản trị viên cần chọn người kế nhiệm
        if (!selectedNewAdmin) {
          error("Vui lòng chọn quản trị viên mới trước khi rời nhóm!");
          return;
        }
        await transferRoomAdmin(room.id, selectedNewAdmin);
      }

      await leaveRoom(room.id, user.uid);
      success("Đã rời nhóm thành công!");
      onClose();
      clearState();
    } catch (error) {
      console.error("Error leaving room:", error);
      error("Có lỗi xảy ra khi rời nhóm!");
    }
  };

  const handleAdminLeaveClick = () => {
    if (room?.members?.length > 1) {
      setShowAdminSelection(true);
    } else {
      // Nếu chỉ có 1 thành viên, giải tán nhóm
      handleDissolveRoom();
    }
  };

  const availableAdmins =
    members?.filter((member) => member.uid !== user.uid) || [];

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Thông tin nhóm</h3>
          <button
            className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        <div className="mb-6 flex items-center">
          <div className="relative mr-4 h-16 w-16">
            {room?.avatar ? (
              <img
                className="h-16 w-16 rounded-full object-cover"
                src={room?.avatar}
                alt="room"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-skybrand-600 text-xl font-semibold text-white">
                {room?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 cursor-pointer rounded-full bg-black/0 transition hover:bg-black/40">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                }}
              />
              <span className="absolute inset-0 hidden items-center justify-center text-white hover:flex">
                <CameraOutlined />
              </span>
            </label>
          </div>
          <div className="flex-1">
            <h3 className="m-0 text-base font-bold">{room?.name}</h3>
            <p className="m-0 text-sm text-slate-500 dark:text-slate-400">
              {members?.length} thành viên
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="mb-3 font-semibold">Thành viên</h4>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {members.map((member) => (
              <li
                key={member.uid}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center">
                  {member.photoURL ? (
                    <img
                      className="h-6 w-6 rounded-full"
                      src={member.photoURL}
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skybrand-600 text-xs text-white">
                      {member.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span className="ml-3 text-sm font-medium">
                    {member.displayName}
                  </span>
                  {member.uid === room?.admin && (
                    <span className="ml-2 rounded-full bg-skybrand-500 px-2 py-0.5 text-[10px] text-white">
                      Quản trị viên
                    </span>
                  )}
                </div>
                {isAdmin && member.uid !== user.uid && (
                  <button
                    className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    onClick={async () => {
                      const confirmed = await confirm("Bạn chắc chắn muốn xóa thành viên này?");
                      if (confirmed) {
                        handleRemoveMember(member.uid);
                      }
                    }}
                  >
                    Xóa
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
          {showAdminSelection && isCurrentUserAdmin && room?.members?.length > 1 && (
            <div className="mb-4">
              <div className="mb-2 font-medium">
                Chọn quản trị viên mới trước khi rời nhóm:
              </div>
              <select
                className="w-full rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm dark:border-gray-700"
                value={selectedNewAdmin || ""}
                onChange={(e) => setSelectedNewAdmin(e.target.value)}
              >
                <option value="" disabled>
                  Chọn quản trị viên mới
                </option>
                {availableAdmins.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                  onClick={() => {
                    setShowAdminSelection(false);
                    setSelectedNewAdmin(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  className="rounded-md border border-orange-300 bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  onClick={handleLeaveRoom}
                  disabled={!selectedNewAdmin}
                >
                  Xác nhận rời nhóm
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button
                  className="rounded-md border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 dark:border-rose-700"
                  onClick={async () => {
                    const confirmed = await confirm(
                      "Bạn có chắc chắn muốn giải tán nhóm này? Hành động không thể hoàn tác!"
                    );
                    if (confirmed) {
                      handleDissolveRoom();
                    }
                  }}
                >
                  Giải tán nhóm
                </button>
                <button
                  className="rounded-md border border-orange-300 bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700"
                  onClick={handleAdminLeaveClick}
                >
                  Rời nhóm
                </button>
              </>
            )}
            {!isAdmin && (
              <button
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-skybrand-500 hover:text-skybrand-600 dark:border-gray-700 dark:text-slate-200"
                onClick={handleLeaveRoom}
              >
                Rời nhóm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
