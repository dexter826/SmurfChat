# SmurfChat - Ứng dụng Chat Thời Gian Thực

<div align="center">
  <img src="public/gui.png" alt="SmurfChat Demo" width="800"/>
  <br>
  *Giao diện chính của ứng dụng SmurfChat*
</div>

## 📋 Giới Thiệu Dự Án

SmurfChat là một ứng dụng chat thời gian thực hiện đại được xây dựng với React và Firebase. Ứng dụng cung cấp trải nghiệm chat mượt mà với nhiều tính năng thông minh như quản lý phòng chat, tin nhắn trực tiếp, chatbot AI, chia sẻ file, ghi âm giọng nói, mã hóa tin nhắn và hệ thống kết bạn. Hỗ trợ đầy đủ các tính năng chat hiện đại với giao diện tiếng Việt thân thiện.

## ✨ Tính Năng Chính

1. **Chat thời gian thực** với WebSocket và Firebase listeners
2. **Mã hóa tin nhắn end-to-end** sử dụng CryptoJS
3. **Chatbot AI** tích hợp OpenAI GPT-4
4. **Quản lý phòng chat** với phân quyền admin/thành viên
5. **Tin nhắn trực tiếp** (Direct Messages) 1-1
6. **Thu hồi tin nhắn** trong vòng 10 phút
7. **Reactions và emoji** cho tin nhắn
8. **Chia sẻ file, hình ảnh, vị trí** với Supabase Storage
9. **Ghi âm và gửi tin nhắn thoại**
10. **Hệ thống kết bạn và chặn người dùng**
11. **Tìm kiếm tin nhắn** trong phòng chat
12. **Mention (@) người dùng**
13. **Link preview** tự động
14. **Dark/Light mode** với theme switcher
15. **Responsive design** cho mọi thiết bị
16. **PWA support** cho mobile

## 🛠️ Công Nghệ Sử Dụng

- **React 17** - UI Framework
- **Firebase 9** - Backend (Firestore, Auth, Real-time)
- **Supabase** - File storage
- **Tailwind CSS** - Styling
- **OpenAI API** - Chatbot AI
- **CryptoJS** - Encryption
- **React Query** - Data fetching
- **Lottie** - Animations

## 🗄️ Thiết Kế CSDL Firestore

### 📊 Cấu Trúc Collections

#### 1. **users** - Thông tin người dùng

```javascript
{
  uid: string,              // Firebase Auth UID
  displayName: string,      // Tên hiển thị
  email: string,           // Email
  photoURL: string|null,   // Avatar URL
  keywords: string[],      // Từ khóa tìm kiếm
  createdAt: timestamp,
  lastSeen: timestamp
}
```

#### 2. **messages** - Tin nhắn thống nhất

```javascript
{
  id: string,
  text: string,
  encryptedText: string|null,     // Nội dung mã hóa
  uid: string,                    // Người gửi
  displayName: string,
  photoURL: string|null,
  chatType: 'room'|'direct',      // Loại chat
  chatId: string,                 // ID phòng hoặc cuộc trò chuyện
  messageType: 'text'|'file'|'voice'|'location',
  status: 'sent'|'recalled',
  isEncrypted: boolean,           // Có mã hóa không
  contentHash: string|null,       // Hash nội dung
  fileData: object|null,
  encryptedFileData: string|null,
  locationData: object|null,
  encryptedLocationData: string|null,
  readByDetails: object,          // {userId: timestamp}
  recalled: boolean,
  recalledAt: timestamp|null,
  originalText: string|null,      // Nội dung gốc khi thu hồi
  createdAt: timestamp,
  updatedAt: timestamp|null
}
```

#### 3. **rooms** - Phòng chat nhóm

```javascript
{
  id: string,
  name: string,
  description: string,
  admin: string,              // UID admin
  members: string[],          // Array UID thành viên
  avatar: string|null,
  lastMessage: string,
  lastMessageAt: timestamp,
  dissolved: boolean,
  pinned: boolean,
  mutedBy: object,            // {userId: boolean}
  lastSeen: object,           // {userId: timestamp}
  typingStatus: object        // {userId: boolean}
}
```

#### 4. **conversations** - Cuộc trò chuyện trực tiếp

```javascript
{
  id: string,
  participants: string[],     // [uid1, uid2] sorted
  lastMessage: string,
  lastMessageAt: timestamp,
  createdAt: timestamp,
  lastSeen: object,           // {userId: timestamp}
  typingStatus: object        // {userId: boolean}
}
```

#### 5. **friends** - Danh sách bạn bè

```javascript
{
  id: string,
  participants: string[],     // [uid1, uid2] sorted
  createdAt: timestamp
}
```

#### 6. **friend_requests** - Lời mời kết bạn

```javascript
{
  id: string,
  from: string,               // UID người gửi
  to: string,                 // UID người nhận
  status: 'pending'|'accepted'|'declined',
  createdAt: timestamp
}
```

#### 7. **blocked_users** - Người dùng bị chặn

```javascript
{
  id: string,
  blockerId: string,          // UID người chặn
  blockedId: string,          // UID bị chặn
  createdAt: timestamp
}
```

#### 8. **votes** - Voting trong phòng

```javascript
{
  id: string,
  roomId: string,
  creatorId: string,
  question: string,
  options: string[],
  votes: object,              // {userId: optionIndex}
  createdAt: timestamp
}
```

#### 9. **archived_chats** - Chat đã lưu trữ

```javascript
{
  userId: string,        // UID người dùng lưu trữ
  chatId: string,        // ID của chat (room hoặc conversation)
  isConversation: boolean, // true nếu là conversation, false nếu là room
  archivedAt: timestamp  // Thời gian lưu trữ
}
```

### 🔐 Bảo Mật & Quy Tắc Truy Cập

- **Authentication bắt buộc**: Tất cả operations yêu cầu Firebase Auth
- **Users**: Chỉ đọc/ghi dữ liệu của chính mình, cho phép đọc public để tìm kiếm
- **Messages**: Tất cả users đã auth có thể truy cập (mã hóa ở application level)
- **Rooms**: Chỉ members mới có thể truy cập
- **Conversations**: Chỉ participants mới có thể truy cập
- **Friends/Requests**: Tất cả users đã auth có thể truy cập
- **Archived chats**: Chỉ owner mới có thể truy cập

### 🔍 Chiến Lược Query

- **Query Builder**: Class hỗ trợ build queries với conditions và orderBy
- **Real-time listeners**: Sử dụng onSnapshot cho updates tức thì
- **Pagination**: Limit queries để tối ưu performance
- **Composite queries**: Kết hợp where và orderBy cho filtering phức tạp

### 🛡️ Mã Hóa Dữ Liệu

- **End-to-end encryption**: Sử dụng CryptoJS với master key từ credentials
- **Encrypted fields**: text, fileData, locationData
- **Content hashing**: Đảm bảo tính toàn vẹn
- **Application-level**: Firestore chỉ lưu trữ, không xử lý encryption

## 🚀 Cách Cài Đặt

### Yêu Cầu Hệ Thống

- Node.js 14.0 trở lên
- npm hoặc yarn
- Git

### Cách Clone Repo

```bash
git clone https://github.com/dexter826/SmurfChat.git
cd SmurfChat
```

### Lệnh Cài Đặt Dependencies

```bash
npm install
```

### Cách Chạy Dự Án

**Development:**

```bash
npm start
```

**Production:**

```bash
npm run build
```

## 📖 Hướng Dẫn Sử Dụng

1. **Đăng ký/Đăng nhập:** Sử dụng email và password hoặc Google OAuth
2. **Tạo phòng chat:** Nhấn nút "Tạo phòng" và mời thành viên
3. **Gửi tin nhắn:** Nhập text, upload file, hoặc ghi âm
4. **Chat với AI:** Chọn chatbot trong danh sách cuộc trò chuyện
5. **Quản lý bạn bè:** Gửi lời mời kết bạn và chấp nhận
6. **Cài đặt:** Thay đổi theme, profile trong menu cài đặt

## 📁 Cấu Trúc Dự Án

```
SmurfChat/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── ChatRoom/       # Chat interface
│   │   ├── Login/          # Auth components
│   │   ├── Modals/         # Modal dialogs
│   │   └── FileUpload/     # File handling
│   ├── Context/            # React contexts
│   ├── firebase/           # Firebase config & services
│   ├── supabase/           # Supabase config
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   └── App.jsx             # Main app
├── package.json
└── tailwind.config.js
```

## 🎉 Kết Luận

SmurfChat không chỉ là một ứng dụng chat thông thường, mà là một nền tảng giao tiếp hiện đại dành cho sinh viên. Với sự kết hợp giữa công nghệ tiên tiến và giao diện thân thiện, SmurfChat mang đến trải nghiệm chat an toàn, tiện lợi và đầy đủ tính năng.

**Hãy trải nghiệm SmurfChat ngay hôm nay và kết nối với bạn bè một cách thông minh hơn! 🚀**

---

<div align="center">
  <strong>🎓 Đồ án môn học NoSQL - Trường Đại học Công Thương TP.HCM</strong><br>
  <em>Khoa Công Nghệ Thông Tin</em><br>
  <em>Nhóm: Trần Công Minh, Lê Đức Trung, Nguyễn Chí Tài, Tạ Nguyên Vũ</em>
</div>
