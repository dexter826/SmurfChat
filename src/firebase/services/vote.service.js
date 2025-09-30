import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';

// Dịch vụ quản lý bình chọn

// Tạo một bình chọn mới
export const createVote = async (voteData) => {
  try {
    const docRef = await addDoc(collection(db, 'votes'), {
      ...voteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      votes: {}, // Đối tượng lưu trữ bình chọn của người dùng: { userId: optionIndex }
      voteCounts: voteData.options.map(() => 0), // Mảng số lượng bình chọn cho mỗi tùy chọn
    });
    return docRef.id;
  } catch (error) {
    console.error('Lỗi tạo bình chọn:', error);
    throw error;
  }
};

// Đưa ra bình chọn hoặc thay đổi bình chọn hiện có
export const castVote = async (voteId, userId, selectedOptions) => {
  const voteRef = doc(db, 'votes', voteId);

  try {
    // Lấy dữ liệu bình chọn hiện tại
    const voteDoc = await getDoc(voteRef);
    if (!voteDoc.exists()) {
      throw new Error('Không tìm thấy bình chọn');
    }

    const voteData = voteDoc.data();
    const currentVotes = voteData.votes || {};
    const currentCounts = [...(voteData.voteCounts || [])];

    // Đảm bảo selectedOptions là một mảng
    const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];

    // Xóa bình chọn trước đó nếu tồn tại
    if (currentVotes[userId] !== undefined) {
      const previousOptions = Array.isArray(currentVotes[userId])
        ? currentVotes[userId]
        : [currentVotes[userId]];

      previousOptions.forEach(optionIndex => {
        if (optionIndex >= 0 && optionIndex < currentCounts.length) {
          currentCounts[optionIndex] = Math.max(0, currentCounts[optionIndex] - 1);
        }
      });
    }

    // Thêm bình chọn mới
    currentVotes[userId] = optionsArray;

    optionsArray.forEach(optionIndex => {
      if (optionIndex >= 0 && optionIndex < currentCounts.length) {
        currentCounts[optionIndex] = (currentCounts[optionIndex] || 0) + 1;
      }
    });

    await updateDoc(voteRef, {
      votes: currentVotes,
      voteCounts: currentCounts,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Lỗi đưa ra bình chọn:', error);
    throw error;
  }
};

// Xóa bình chọn
export const deleteVote = async (voteId) => {
  const voteRef = doc(db, 'votes', voteId);

  try {
    await deleteDoc(voteRef);
  } catch (error) {
    console.error('Lỗi xóa bình chọn:', error);
    throw error;
  }
};
