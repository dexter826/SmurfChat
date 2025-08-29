import React, { useState, useContext } from "react";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  BarChartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { castVote, deleteVote } from "../../firebase/services";
import { AuthContext } from "../../Context/AuthProvider.jsx";
import { useAlert } from "../../Context/AlertProvider";
import useFirestore from "../../hooks/useFirestore";

const VoteMessage = ({ vote }) => {
  const {
    user: { uid },
  } = useContext(AuthContext);
  const { success, error, confirm } = useAlert();
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [votersModalVisible, setVotersModalVisible] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);

  // Real-time vote data
  const voteCondition = React.useMemo(
    () => ({
      fieldName: "__name__",
      operator: "==",
      compareValue: vote.id,
    }),
    [vote.id]
  );

  const voteData = useFirestore("votes", voteCondition)?.[0] || vote;

  const userVote = voteData.votes?.[uid];
  const hasVoted = userVote !== undefined;

  // Initialize selected options from existing vote
  React.useEffect(() => {
    if (userVote && Array.isArray(userVote)) {
      setSelectedOptions(userVote);
    } else if (userVote !== undefined) {
      setSelectedOptions([userVote]);
    }
  }, [userVote]);
  const isCreator = voteData.createdBy === uid;
  const totalVotes = Object.keys(voteData.votes || {}).length;

  // Get all users for voter information
  const allUsersCondition = React.useMemo(
    () => ({
      fieldName: "uid",
      operator: "in",
      compareValue: Object.keys(voteData.votes || {}),
    }),
    [voteData.votes]
  );

  const allUsers = useFirestore(
    "users",
    Object.keys(voteData.votes || {}).length > 0 ? allUsersCondition : null
  );

  const handleOptionToggle = async (optionIndex) => {
    if (hasVoted || loading) return;

    const newSelectedOptions = selectedOptions.includes(optionIndex)
      ? selectedOptions.filter((idx) => idx !== optionIndex)
      : [...selectedOptions, optionIndex];

    setSelectedOptions(newSelectedOptions);

    // Auto-save vote if there are selected options
    if (newSelectedOptions.length > 0) {
      try {
        setLoading(true);
        await castVote(voteData.id, uid, newSelectedOptions);
        success("Đã vote thành công!");
      } catch (err) {
        console.error("Error voting:", err);
        error("Có lỗi xảy ra khi vote");
        // Revert selection on error
        setSelectedOptions(selectedOptions);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteVote(voteData.id);
      success("Đã xóa vote");
    } catch (err) {
      console.error("Error deleting vote:", err);
      error("Có lỗi xảy ra khi xóa vote");
    }
  };

  const getOptionVoteCount = (optionIndex) => {
    if (!voteData.votes) return 0;
    return Object.values(voteData.votes).filter((vote) => {
      if (Array.isArray(vote)) {
        return vote.includes(optionIndex);
      }
      return vote === optionIndex;
    }).length;
  };

  const getOptionPercentage = (optionIndex) => {
    if (totalVotes === 0) return 0;
    const count = getOptionVoteCount(optionIndex);
    return Math.round((count / totalVotes) * 100);
  };

  const getVotersForOption = (optionIndex) => {
    if (!voteData.votes || !allUsers) return [];

    const voterIds = Object.entries(voteData.votes)
      .filter(([, vote]) => {
        if (Array.isArray(vote)) {
          return vote.includes(optionIndex);
        }
        return vote === optionIndex;
      })
      .map(([userId]) => userId);

    return voterIds.map((userId) => {
      const user = allUsers.find((u) => u.uid === userId);
      return user || { uid: userId, displayName: "Unknown User", photoURL: "" };
    });
  };

  const handleShowVoters = (optionIndex) => {
    setSelectedOptionIndex(optionIndex);
    setVotersModalVisible(true);
  };

  return (
    <div className="mx-auto my-2 block max-w-[60%] rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-skybrand-700 dark:text-skybrand-300">
          <BarChartOutlined />
          <h5 className="m-0 text-base font-semibold">{voteData.title}</h5>
        </div>
        {isCreator && (
          <button
            className="rounded-md border border-rose-300 p-1 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
            onClick={async () => {
              const confirmed = await confirm("Bạn có chắc muốn xóa vote này?");
              if (confirmed) {
                handleDelete();
              }
            }}
            title="Xóa vote"
          >
            <DeleteOutlined />
          </button>
        )}
      </div>

      {voteData.description && (
        <div className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {voteData.description}
        </div>
      )}

      <div>
        {voteData.options?.map((option, index) => {
          const selected = selectedOptions.includes(index);
          const userSelected = Array.isArray(userVote)
            ? userVote.includes(index)
            : userVote === index;
          const percent = getOptionPercentage(index);
          return (
            <div
              key={index}
              className={`my-2 cursor-pointer rounded-lg border px-3 py-2 ${
                hasVoted ? "cursor-default" : ""
              } ${
                selected
                  ? "border-skybrand-500 bg-skybrand-50 dark:bg-skybrand-900/10"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleOptionToggle(index)}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2">
                  {hasVoted && userSelected && (
                    <CheckCircleOutlined className="text-emerald-600" />
                  )}
                  {!hasVoted && selected && (
                    <CheckCircleOutlined className="text-skybrand-600" />
                  )}
                  <span className="text-sm">{option}</span>
                </div>
                {hasVoted && (
                  <button
                    className="text-xs text-slate-500 underline dark:text-slate-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowVoters(index);
                    }}
                  >
                    {getOptionVoteCount(index)} vote
                    {getOptionVoteCount(index) !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
              {hasVoted && (
                <div className="mt-2 h-2 w-full rounded bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-2 rounded ${
                      userSelected ? "bg-emerald-500" : "bg-skybrand-600"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-2 text-xs text-slate-500 dark:border-gray-700 dark:text-slate-400">
        {hasVoted ? (
          <span>
            Tổng cộng: {totalVotes} người đã vote • Tạo bởi{" "}
            {voteData.creatorName}
          </span>
        ) : (
          <span>
            Chọn một hoặc nhiều lựa chọn • Tạo bởi {voteData.creatorName}
          </span>
        )}
      </div>

      {votersModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setVotersModalVisible(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="m-0 text-sm font-semibold">
                Người đã vote cho: {voteData.options?.[selectedOptionIndex]}
              </h4>
              <button
                className="rounded px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setVotersModalVisible(false)}
              >
                Đóng
              </button>
            </div>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {(selectedOptionIndex !== null
                ? getVotersForOption(selectedOptionIndex)
                : []
              ).map((voter) => (
                <li key={voter.uid} className="flex items-center gap-2">
                  {voter.photoURL ? (
                    <img
                      className="h-6 w-6 rounded-full"
                      src={voter.photoURL}
                      alt="avatar"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-skybrand-600 text-[10px] text-white">
                      {voter.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="text-sm">{voter.displayName}</div>
                  <div className="ml-auto text-xs text-slate-500">
                    {voter.uid === uid ? "Bạn" : "Thành viên"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteMessage;
