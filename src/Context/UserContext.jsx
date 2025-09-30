import React, { createContext, useContext, useMemo } from "react";
import useOptimizedFirestore from "../hooks/useOptimizedFirestore";
import { AuthContext } from "./AuthProvider";

// Ngữ cảnh người dùng toàn cục để tránh truy vấn N+1
const UserContext = createContext({});

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUsers must be used within UserProvider");
  }
  return context;
};

export function UserProvider({ children }) {
  const { user: currentUser } = useContext(AuthContext);

  // Nguồn chân lý duy nhất cho tất cả người dùng - lấy tất cả mà không có điều kiện
  const { documents: allUsers } = useOptimizedFirestore(
    currentUser?.uid ? "users" : null, // Chỉ lấy nếu người dùng đã xác thực và có uid
    null, // Không có điều kiện - lấy tất cả người dùng
    null, // Không sắp xếp theo
    "asc",
    true, // Thời gian thực
    "all_users" // Khóa tùy chỉnh để tránh xung đột
  );

  // Lọc bỏ người dùng hiện tại khỏi kết quả
  const filteredUsers = useMemo(
    () => allUsers?.filter((user) => user.uid !== currentUser?.uid) || [],
    [allUsers, currentUser?.uid]
  );

  // Tra cứu người dùng được tối ưu hóa với Map để hiệu suất O(1)
  const usersMap = useMemo(() => {
    const map = new Map();
    filteredUsers.forEach((user) => {
      if (user?.uid) {
        map.set(user.uid, user);
      }
    });
    // Bao gồm người dùng hiện tại
    if (currentUser?.uid) {
      map.set(currentUser.uid, currentUser);
    }
    return map;
  }, [filteredUsers, currentUser]);

  // Các hàm tra cứu nhanh
  const getUserById = useMemo(
    () => (uid) => {
      if (!uid) return null;
      return (
        usersMap.get(uid) || {
          uid,
          displayName: "Người dùng không xác định",
          photoURL: "",
          email: "",
        }
      );
    },
    [usersMap]
  );

  const getUsersByIds = useMemo(
    () =>
      (uids = []) => {
        return uids.map((uid) => getUserById(uid)).filter(Boolean);
      },
    [getUserById]
  );

  // Lấy người tham gia khác trong cuộc trò chuyện (được tối ưu hóa)
  const getOtherParticipant = useMemo(
    () => (conversation) => {
      if (!conversation?.participants || !currentUser?.uid) {
        return {
          displayName: "Người dùng không xác định",
          photoURL: "",
          uid: "",
        };
      }

      const otherUid = conversation.participants.find(
        (uid) => uid !== currentUser.uid
      );
      return (
        getUserById(otherUid) || {
          displayName: "Người dùng không xác định",
          photoURL: "",
          uid: otherUid,
        }
      );
    },
    [getUserById, currentUser?.uid]
  );

  // Tra cứu người dùng hàng loạt để giảm re-renders
  const batchGetUsers = useMemo(
    () =>
      (requests = []) => {
        const results = {};
        requests.forEach(({ key, uids }) => {
          results[key] = getUsersByIds(uids);
        });
        return results;
      },
    [getUsersByIds]
  );

  const contextValue = useMemo(
    () => ({
      // Dữ liệu cốt lõi
      allUsers: filteredUsers,
      usersMap,

      // Các hàm tra cứu nhanh
      getUserById,
      getUsersByIds,
      getOtherParticipant,
      batchGetUsers,

      // Thống kê hiệu suất
      totalUsers: filteredUsers.length,
      isLoading: filteredUsers.length === 0,
    }),
    [
      filteredUsers,
      usersMap,
      getUserById,
      getUsersByIds,
      getOtherParticipant,
      batchGetUsers,
    ]
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export { UserContext };
