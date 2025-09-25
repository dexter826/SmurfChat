# SmurfChat - Ứng dụng Chat Thời Gian Thực

<div align="center">
  <img src="public/gui.png" alt="SmurfChat Demo" width="800"/>
  <br>
  *Giao diện đăng nhập của ứng dụng SmurfChat*
</div>

## 📋 Giới Thiệu Dự Án

SmurfChat là một ứng dụng chat thời gian thực hiện đại được xây dựng với React và Firebase. Ứng dụng cung cấp trải nghiệm chat mượt mà với nhiều tính năng thông minh như quản lý phòng chat, tin nhắn trực tiếp, chatbot AI, chia sẻ file, ghi âm giọng nói và hệ thống kết bạn. Hỗ trợ đầy đủ các tính năng chat hiện đại với giao diện tiếng Việt thân thiện.

## ✨ Tính Năng Chính

1. **Chat thời gian thực** với Firebase Firestore listeners
2. **Chatbot AI** tích hợp OpenRouterAPI
3. **Quản lý phòng chat** với phân quyền admin/thành viên
4. **Tin nhắn trực tiếp** (Direct Messages) 1-1
5. **Thu hồi tin nhắn** trong vòng 10 phút
6. **Reactions và emoji** cho tin nhắn
7. **Chia sẻ file, hình ảnh, vị trí** với Supabase Storage
8. **Ghi âm và gửi tin nhắn thoại**
9. **Hệ thống kết bạn và chặn người dùng**
10. **Tìm kiếm tin nhắn** trong phòng chat
11. **Mention (@) người dùng**
12. **Link preview** tự động
13. **Dark/Light mode** với theme switcher

## 🛠️ Công Nghệ Sử Dụng

- **React 17** - UI Framework
- **Firebase 9** - Backend (Firestore, Auth, Real-time)
- **Supabase** - File storage
- **Tailwind CSS** - Styling
- **OpenAI API** - Chatbot AI
- **React Query** - Data fetching
- **Lottie** - Animations

## 🗄️ Thiết Kế CSDL Firestore

_Lưu ý: Bao gồm 9 collections_

### 📊 Cấu Trúc Collections

#### 1. **users** - Thông tin người dùng

```javascript
{
   uid: string,              // Firebase Auth UID
   displayName: string,      // Tên hiển thị
   email: string,           // Email
   photoURL: string|null,   // Avatar URL
   providerId: string,      // Provider đăng nhập ('password', 'google', etc.)
   keywords: string[],      // Từ khóa tìm kiếm
   isOnline: boolean,       // Trạng thái online
   lastSeen: timestamp,     // Thời gian hoạt động cuối
   createdAt: timestamp,    // Thời gian tạo tài khoản
   updatedAt: timestamp     // Thời gian cập nhật cuối
}
```

#### 2. **messages** - Tin nhắn thống nhất

```javascript
{
   id: string,
   text: string,                   // Nội dung text
   uid: string,                    // Người gửi
   displayName: string,          // Tên người gửi
   photoURL: string|null,       // Avatar người gửi
   chatType: 'room'|'direct',      // Loại chat
   chatId: string,                 // ID phòng hoặc cuộc trò chuyện
   messageType: 'text'|'file'|'voice'|'location', // Loại tin nhắn
   fileData: object|null,          // Dữ liệu file
   locationData: object|null,      // Dữ liệu vị trí
   readByDetails: object,          // {userId: timestamp}
   reactions: object,              // {emoji: [userIds]}
   recalled: boolean,              // Đã thu hồi
   recalledAt: timestamp|null,     // Thời gian thu hồi
   originalText: string|null,      // Text gốc
   originalFileData: object|null,  // File data gốc
   originalLocationData: object|null, // Location data gốc
   lastReadAt: timestamp|null,     // Thời gian đọc cuối
   forwarded: boolean,             // Đã forward
   createdAt: timestamp,           // Thời gian tạo
   updatedAt: timestamp            // Thời gian cập nhật (khi add reaction)
}
```

#### 3. **rooms** - Phòng chat nhóm

```javascript
{
   id: string,
   name: string,               // Tên phòng
   admin: string,              // UID admin
   members: string[],          // Array UID thành viên
   avatar: string|null,        // Avatar phòng
   lastMessage: string,        // Tin nhắn cuối
   lastMessageAt: timestamp,   // Thời gian gửi tin nhắn cuối
   lastSeen: object,           // {userId: timestamp}
   typingStatus: object,       // {userId: boolean}
   pinned: boolean,            // Đã pin
   pinnedAt: timestamp|null,   // Thời gian pin
   updatedAt: timestamp,       // Thời gian cập nhật
   updatedBy: string           // UID người cập nhật lastMessage
}
```

#### 4. **conversations** - Cuộc trò chuyện trực tiếp

```javascript
{
   id: string,
   participants: string[],     // [uid1, uid2] sorted
   lastMessage: string,       // Tin nhắn cuối
   lastMessageAt: timestamp,  // Thời gian gửi tin nhắn cuối
   lastSeen: object,           // {userId: timestamp}
   typingStatus: object,       // {userId: boolean}
   pinned: boolean,            // Đã pin
   pinnedAt: timestamp|null,   // Thời gian pin
   updatedAt: timestamp,       // Thời gian cập nhật
   updatedBy: string           // UID người cập nhật lastMessage
}
```

#### 5. **friends** - Danh sách bạn bè

```javascript
{
  id: string,
  participants: string[],     // [uid1, uid2] sorted
  createdAt: timestamp       // Thời gian tạo
}
```

#### 6. **friend_requests** - Lời mời kết bạn

```javascript
{
  id: string,
  from: string,               // UID người gửi
  to: string,                 // UID người nhận
  participants: string,       // Combined key for queries
  status: 'pending'|'accepted'|'declined'|'cancelled', // Trạng thái
  createdAt: timestamp,      // Thời gian tạo
  updatedAt: timestamp       // Thời gian cập nhật
}
```

#### 7. **blocked_users** - Người dùng bị chặn

```javascript
{
   id: string,
   blocker: string,          // UID người chặn
   blocked: string,          // UID bị chặn
   createdAt: timestamp
}
```

#### 8. **votes** - Voting trong phòng

```javascript
{
   id: string,
   roomId: string,             // ID phòng chat
   creatorId: string,          // UID người tạo vote
   title: string,              // Tiêu đề vote
   options: string[],          // Mảng các lựa chọn
   votes: object,              // {userId: optionIndex[]} - votes của từng user
   voteCounts: object,         // {optionIndex: count} - số lượng vote cho mỗi option
   createdAt: timestamp,
   updatedAt: timestamp
}
```

#### 9. **archived_chats** - Chat đã lưu trữ

```javascript
{
   id: string,
   userId: string,             // UID người archive
   chatId: string,             // ID room/conversation
   isConversation: boolean,    // true nếu là conversation, false nếu là room
   archivedAt: timestamp       // Thời gian archive
}
```

### 🔐 Bảo Mật & Quy Tắc Truy Cập

- **Authentication bắt buộc**: Tất cả operations yêu cầu Firebase Auth
- **Users**: Chỉ đọc/ghi dữ liệu của chính mình, cho phép đọc public để tìm kiếm
- **Messages**: Tất cả users đã auth có thể truy cập
- **Rooms**: Chỉ members mới có thể truy cập
- **Conversations**: Chỉ participants mới có thể truy cập
- **Friends/Requests**: Tất cả users đã auth có thể truy cập
- **Archived chats**: Chỉ owner mới có thể truy cập

### 🔍 Chiến Lược Query

- **Query Builder**: Class hỗ trợ build queries với conditions và orderBy
- **Real-time listeners**: Sử dụng onSnapshot cho updates tức thì
- **Pagination**: Limit queries để tối ưu performance
- **Composite queries**: Kết hợp where và orderBy cho filtering phức tạp

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
  Năm học 2025-2026<br>
  <em>Khoa Công Nghệ Thông Tin</em><br>
  <em>Nhóm 15: Trần Công Minh, Lê Đức Trung, Tạ Nguyên Vũ</em>
</div>
