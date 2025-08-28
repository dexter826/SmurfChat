import React, { useContext, useState } from 'react';
import { AppContext } from '../../Context/AppProvider';
import { debounce } from 'lodash';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

function DebounceSelect({
  fetchOptions,
  debounceTimeout = 300,
  curMembers,
  ...props
}) {
  // Search: abcddassdfasdf

  const [fetching, setFetching] = useState(false);
  const [options, setOptions] = useState([]);

  const debounceFetcher = React.useMemo(() => {
    const loadOptions = (value) => {
      setOptions([]);
      setFetching(true);

      fetchOptions(value, curMembers).then((newOptions) => {
        setOptions(newOptions);
        setFetching(false);
      });
    };

    return debounce(loadOptions, debounceTimeout);
  }, [debounceTimeout, fetchOptions, curMembers]);

  React.useEffect(() => {
    return () => {
      // clear when unmount
      setOptions([]);
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700"
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

async function fetchUserList(search, curMembers) {
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
    .filter((opt) => !curMembers.includes(opt.value));
}

export default function InviteMemberModal() {
  const {
    isInviteMemberVisible,
    setIsInviteMemberVisible,
    selectedRoomId,
    selectedRoom,
  } = useContext(AppContext);
  const [value, setValue] = useState([]);
  const [form] = [null];

  const handleOk = () => {
    // Kiểm tra số lượng thành viên tối thiểu (3 người bao gồm admin)
    const totalMembers = selectedRoom.members.length + value.length;

    if (totalMembers < 3) {
      window.alert('Nhóm chat phải có tối thiểu 3 thành viên (bao gồm người tạo nhóm).');
      return;
    }

    // reset form value
    // reset
    setValue([]);

    // update members in current room
    const roomRef = doc(db, 'rooms', selectedRoomId);

    updateDoc(roomRef, {
      members: [...selectedRoom.members, ...value.map((val) => val.value)],
    });

    setIsInviteMemberVisible(false);
  };

  const handleCancel = () => {
    // reset form value
    // reset
    setValue([]);

    setIsInviteMemberVisible(false);
  };

  if (!isInviteMemberVisible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Mời thêm thành viên</h3>
          <button className="rounded-md px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={handleCancel}>Đóng</button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tên các thành viên</label>
          <DebounceSelect
            value={value}
            placeholder='Nhập tên thành viên'
            fetchOptions={fetchUserList}
            onChange={(newValue) => setValue(newValue)}
            curMembers={selectedRoom.members}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700" onClick={handleCancel}>Hủy</button>
          <button className="rounded-md bg-skybrand-600 px-4 py-2 text-sm font-medium text-white hover:bg-skybrand-700" onClick={handleOk}>Mời</button>
        </div>
      </div>
    </div>
  );
}
