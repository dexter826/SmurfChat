import React, { useState, useContext, useMemo, useEffect } from "react";
import {
  FaCheckCircle,
  FaTrash,
  FaChartBar,
  FaUser,
  FaTimes,
} from "react-icons/fa";
import { castVote, deleteVote } from "../../firebase/services";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { AppContext } from "../../Context/AppProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import useOptimizedFirestore from "../../hooks/useOptimizedFirestore";

const VoteMessage = ({ vote }) => {
  const {
    user: { uid },
  } = useContext(AuthContext);
  const { members } = useContext(AppContext);
  const { success, error, confirm } = useAlert();
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [votersModalVisible, setVotersModalVisible] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);

  // Real-time vote data with optimized condition
  const { documents: voteDataArray } = useOptimizedFirestore(
    "votes",
    useMemo(
      () => ({
        fieldName: "__name__",
        operator: "==",
        compareValue: vote.id,
      }),
      [vote.id]
    )
  );
  const voteData = voteDataArray?.[0] || vote;

  const userVote = voteData.votes?.[uid];
  const hasVoted = userVote !== undefined;
  const isCreator = voteData.creatorId === uid;
  const totalVotes = Object.keys(voteData.votes || {}).length;

  // Initialize selected options from existing vote
  useEffect(() => {
    if (userVote && Array.isArray(userVote)) {
      setSelectedOptions(userVote);
    } else if (userVote !== undefined) {
      setSelectedOptions([userVote]);
    }
  }, [userVote]);

  // Get all users for voter information
  const { documents: allUsersData } = useOptimizedFirestore(
    "users",
    useMemo(
      () => ({
        fieldName: "displayName",
        operator: "!=",
        compareValue: "",
      }),
      []
    )
  );

  // Filter to get all users excluding current user logic if needed
  const allUsers = useMemo(() => allUsersData || [], [allUsersData]);

  // Calculate vote statistics
  const voteStats = useMemo(() => {
    const votes = voteData.votes || {};
    const stats = voteData.options.map((option, index) => {
      const voters = Object.entries(votes).filter(([, userVotes]) => {
        return Array.isArray(userVotes)
          ? userVotes.includes(index)
          : userVotes === index;
      });

      return {
        option,
        count: voters.length,
        percentage:
          totalVotes > 0 ? Math.round((voters.length / totalVotes) * 100) : 0,
        voters: voters.map(([userId]) => {
          // Try to find user in members first (room members), then in allUsers
          let user = members.find((u) => u.uid === userId);
          if (!user) {
            user = allUsers.find((u) => u.uid === userId);
          }
          return {
            uid: userId,
            displayName:
              user?.displayName ||
              user?.email ||
              `User ${userId.substring(0, 6)}...`,
          };
        }),
      };
    });

    return stats;
  }, [voteData.options, voteData.votes, totalVotes, allUsers, members]);

  const handleOptionToggle = (optionIndex) => {
    // Allow changing votes

    // Auto-submit vote when option is selected (always multiple choice)
    const newSelectedOptions = selectedOptions.includes(optionIndex)
      ? selectedOptions.filter((i) => i !== optionIndex)
      : [...selectedOptions, optionIndex];

    setSelectedOptions(newSelectedOptions);

    // Auto-submit the vote immediately
    if (newSelectedOptions.length > 0) {
      handleSubmitVote(newSelectedOptions);
    }
  };

  const handleSubmitVote = async (optionsToSubmit = selectedOptions) => {
    if (optionsToSubmit.length === 0) {
      error("Vui lòng chọn ít nhất một tùy chọn!");
      return;
    }

    setLoading(true);
    try {
      await castVote(vote.id, uid, optionsToSubmit);
      // Don't show success modal - removed as requested
    } catch (err) {
      console.error("Error casting vote:", err);
      error("Không thể vote. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVote = async () => {
    const confirmed = await confirm(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa cuộc vote này? Hành động này không thể hoàn tác."
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteVote(vote.id);
      success("Đã xóa cuộc vote!");
    } catch (err) {
      console.error("Error deleting vote:", err);
      error("Không thể xóa vote!");
    } finally {
      setLoading(false);
    }
  };

  const showVoters = (optionIndex) => {
    setSelectedOptionIndex(optionIndex);
    setVotersModalVisible(true);
  };

  return (
    <>
      <div className="mx-auto my-3 max-w-[85%] rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-800/40 dark:from-slate-800 dark:to-slate-900">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FaChartBar className="text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">
              {voteData.title}
            </h4>
          </div>
          {isCreator && (
            <button
              onClick={handleDeleteVote}
              disabled={loading}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
              title="Xóa vote"
            >
              <FaTrash />
            </button>
          )}
        </div>

        {/* Description */}
        {voteData.description && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            {voteData.description}
          </p>
        )}

        {/* Vote Options */}
        <div className="space-y-2">
          {voteStats.map((stat, index) => {
            const isSelected = selectedOptions.includes(index);
            const maxCount = Math.max(...voteStats.map((s) => s.count));
            const isWinning = stat.count > 0 && stat.count === maxCount;

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  isSelected
                    ? "border-blue-400 bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800"
                } ${
                  isWinning && totalVotes > 0
                    ? "ring-2 ring-green-400 dark:ring-green-600"
                    : ""
                }`}
                onClick={() => handleOptionToggle(index)}
              >
                {/* Progress Bar Background */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-blue-200/40 to-blue-300/40 transition-all duration-300 dark:from-blue-800/20 dark:to-blue-700/20"
                  style={{ width: `${stat.percentage}%` }}
                />

                {/* Content */}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && (
                        <FaCheckCircle className="text-xs text-white" />
                      )}
                    </div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {stat.option}
                    </span>
                    {isWinning && totalVotes > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Dẫn đầu
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {stat.count} ({stat.percentage}%)
                    </span>
                    {stat.count > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showVoters(index);
                        }}
                        className="rounded px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Chi tiết
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Summary */}
        <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Tổng cộng: {totalVotes} người vote</span>
          <span>Tạo bởi: {voteData.creatorName}</span>
        </div>
      </div>

      {/* Voters Modal */}
      {votersModalVisible && selectedOptionIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">
                Người vote: "{voteStats[selectedOptionIndex]?.option}"
              </h4>
              <button
                onClick={() => setVotersModalVisible(false)}
                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {voteStats[selectedOptionIndex]?.voters.map((voter) => (
                <div
                  key={voter.uid}
                  className="flex items-center gap-2 rounded p-2 bg-gray-50 dark:bg-gray-700"
                >
                  <FaUser className="text-gray-500" />
                  <span className="text-sm">{voter.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoteMessage;
