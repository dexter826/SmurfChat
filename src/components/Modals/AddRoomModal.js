import React, { useContext, useState } from 'react';
import { Form, Modal, Input, Select, Spin, Avatar } from 'antd';
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
    <Select
      labelInValue
      filterOption={false}
      onSearch={debounceFetcher}
      notFoundContent={fetching ? <Spin size='small' /> : null}
      {...props}
    >
      {options.map((opt) => (
        <Select.Option key={opt.value} value={opt.value} title={opt.label}>
          <Avatar size='small' src={opt.photoURL}>
            {opt.photoURL ? '' : opt.label?.charAt(0)?.toUpperCase()}
          </Avatar>
          {` ${opt.label}`}
        </Select.Option>
      ))}
    </Select>
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
  const [form] = Form.useForm();
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleOk = () => {
    // Kiểm tra số lượng thành viên tối thiểu (tối thiểu 3 người bao gồm người tạo)
    const totalMembers = selectedMembers.length + 1; // +1 cho người tạo nhóm

    if (totalMembers < 3) {
      Modal.error({
        title: 'Không thể tạo nhóm',
        content: 'Nhóm chat phải có tối thiểu 3 thành viên (bao gồm người tạo nhóm). Vui lòng chọn thêm ít nhất 2 thành viên nữa.',
      });
      return;
    }

    // Tạo danh sách thành viên bao gồm người tạo và các thành viên được chọn
    const members = [uid, ...selectedMembers.map(member => member.value)];

    // Thêm nhóm mới vào firestore (không lưu mô tả)
    addDocument('rooms', {
      name: form.getFieldValue('name'),
      members: members,
      admin: uid
    });

    // Reset form và state
    form.resetFields();
    setSelectedMembers([]);
    setIsAddRoomVisible(false);
  };

  const handleCancel = () => {
    // reset form value
    form.resetFields();
    setSelectedMembers([]);
    setIsAddRoomVisible(false);
  };

  return (
    <div>
      <Modal
        title='Tạo nhóm chat'
        open={isAddRoomVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <Form form={form} layout='vertical'>
          <Form.Item label='Tên nhóm' name='name' rules={[{ required: true, message: 'Vui lòng nhập tên nhóm!' }]}>
            <Input placeholder='Nhập tên nhóm' />
          </Form.Item>
          {false && (
            <Form.Item label='Mô tả' name='description'>
              <Input.TextArea placeholder='Nhập mô tả nhóm' />
            </Form.Item>
          )}
          <Form.Item label='Thêm thành viên (tối thiểu 2 người)' required>
            <DebounceSelect
              mode='multiple'
              placeholder='Tìm và chọn thành viên'
              fetchOptions={fetchUserList}
              onChange={(newValue) => setSelectedMembers(newValue)}
              value={selectedMembers}
              style={{ width: '100%' }}
              currentUserId={uid}
            />
          </Form.Item>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '-16px', marginBottom: '16px' }}>
            Đã chọn: {selectedMembers.length} thành viên. Cần thêm ít nhất {Math.max(0, 2 - selectedMembers.length)} thành viên nữa.
          </div>
        </Form>
      </Modal>
    </div>
  );
}
