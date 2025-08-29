import React from "react";
import { CameraOutlined } from "@ant-design/icons";
import { AppContext } from "../../Context/AppProvider.jsx";
import { useTheme } from "../../Context/ThemeProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import { updateRoomAvatar } from "../../firebase/services";

function RoomItem({ onClick, children }) {
  return (
    <div
      className="flex cursor-pointer items-center rounded-md px-0 py-2 transition hover:bg-white/10"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function RoomList() {
  const { rooms, setSelectedRoomId } = React.useContext(AppContext);
  const theme = useTheme();
  const { success, error } = useAlert();

  const handleAvatarUpload = async (file, roomId) => {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      // Tạo URL tạm thời cho preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const avatarUrl = e.target.result;
        await updateRoomAvatar(roomId, avatarUrl);
        success("Đã cập nhật avatar phòng!");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Lỗi khi upload avatar:", err);
      error("Không thể cập nhật avatar phòng");
    }
    return false; // Ngăn upload tự động
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <h4
        style={{
          color: theme.colors.sidebarText,
          margin: "0 0 16px 16px",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        Danh sách các phòng
      </h4>
      <div style={{ padding: "0 16px" }}>
        {rooms.map((room) => (
          <RoomItem key={room.id} onClick={() => setSelectedRoomId(room.id)}>
            <div className="relative mr-3 h-10 w-10">
              {room.avatar ? (
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src={room.avatar}
                  alt="room"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-skybrand-600 text-white">
                  {room.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 cursor-pointer rounded-full bg-black/0 transition hover:bg-black/40">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f, room.id);
                  }}
                />
                <span className="absolute inset-0 hidden items-center justify-center text-white hover:flex">
                  <CameraOutlined />
                </span>
              </label>
            </div>
            <div className="flex-1 font-medium text-white">{room.name}</div>
          </RoomItem>
        ))}
      </div>
    </div>
  );
}
