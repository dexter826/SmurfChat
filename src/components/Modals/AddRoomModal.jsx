import React, { useContext, useState } from 'react';
import { AppContext } from '../../Context/AppProvider';
import { addDocument } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import { debounce } from 'lodash';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Component tìm kiếm và chọn thành viên
function DebounceSelect({
  fetchOptions,
  debounceTimeout = 300,
  currentUserId,
  ...props
}) {
  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState([]);

  const debounceFetcher = React.useMemo(() => {
    const loadOptions = (value) => {
      setOptions([]);
      setFetching(true);

      fetchOptions(value, currentUserId).then((newOptions) => {
        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [debounceTimeout, fetchOptions, currentUserId]);

  React.useEffect(() => {
    return () => {
      setOptions([]);
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
        placeholder={props.placeholder}
        onChange={(e) => debounceFetcher(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {(props.value || []).map((v) => (
          <span key={v.value} className="inline-flex items-center gap-1 rounded-full bg-skybrand-100 px-2 py-0.5 text-xs text-skybrand-700 dark:bg-skybrand-900/20 dark:text-skybrand-300">
            {v.label}
            <button type="button" className="text-slate-500" onClick={() => props.onChange((props.value || []).filter(i => i.value !== v.value))}>×</button>
          </span>
        ))}
      </div>
      {fetching ? (
        <div className="mt-2 text-xs text-slate-500">Đang tìm...</div>
      ) : options.length > 0 ? (
        <ul className="mt-2 max-h-48 overflow-y-auto rounded border border-gray-200 bg-white text-sm shadow dark:border-gray-700 dark:bg-slate-900">
          {options.map((opt) => (
            <li
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => props.onChange([...(props.value || []), { value: opt.value, label: opt.label }])}
              title={opt.label}
            >
              {opt.photoURL ? (
                <img className="h-5 w-5 rounded-full" src={opt.photoURL} alt="avatar" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-skybrand-600 text-[10px] text-white">
                  {opt.label?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Hàm tìm kiếm người dùng
async function fetchUserList(search, currentUserId) {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('keywords', 'array-contains', search?.toLowerCase())
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((doc) => ({
      label: doc.data().displayName,
      value: doc.data().uid,
      photoURL: doc.data().photoURL,
    }))
    .filter((opt) => opt.value !== currentUserId);
}

export default function AddRoomModal() {
  const { isAddRoomVisible, setIsAddRoomVisible } = useContext(AppContext);
  const {
    user: { uid },
  } = useContext(AuthContext);
  const [formState, setFormState] = useState({ name: '' });
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleOk = () => {
    // Kiểm tra số lượng thành viên tối thiểu (tối thiểu 3 người bao gồm người tạo)
    const totalMembers = selectedMembers.length + 1; // +1 cho người tạo nhóm

    if (totalMembers < 3) {
      window.alert('Nhóm chat phải có tối thiểu 3 thành viên (bao gồm người tạo nhóm). Vui lòng chọn thêm ít nhất 2 thành viên nữa.');
      return;
    }

    // Tạo danh sách thành viên bao gồm người tạo và các thành viên được chọn
    const members = [uid, ...selectedMembers.map(member => member.value)];

    // Thêm nhóm mới vào firestore (không lưu mô tả)
    addDocument('rooms', {
      name: formState.name,
      members: members,
      admin: uid
    });

    // Reset form và state
    setFormState({ name: '' });
    setSelectedMembers([]);
    setIsAddRoomVisible(false);
  };

  const handleCancel = () => {
    // reset form value
    setFormState({ name: '' });
    setSelectedMembers([]);
    setIsAddRoomVisible(false);
  };

  if (!isAddRoomVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tạo nhóm chat</h3>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleCancel}>Đóng</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tên nhóm</label>
            <input
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-skybrand-500 focus:outline-none focus:ring-2 focus:ring-skybrand-500/20 dark:border-gray-700 dark:bg-slate-700 dark:text-slate-200"
              placeholder='Nhập tên nhóm'
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Thêm thành viên (tối thiểu 2 người)</label>
            <DebounceSelect
              placeholder='Tìm và chọn thành viên'
              fetchOptions={fetchUserList}
              onChange={(newValue) => setSelectedMembers(newValue)}
              value={selectedMembers}
              currentUserId={uid}
            />
            <div className="mt-1 text-xs text-slate-500">
              Đã chọn: {selectedMembers.length} thành viên. Cần thêm ít nhất {Math.max(0, 2 - selectedMembers.length)} thành viên nữa.
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700" onClick={handleCancel}>Hủy</button>
          <button className="rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700" onClick={handleOk}>Tạo nhóm</button>
        </div>
      </div>
    </div>
  );
}
