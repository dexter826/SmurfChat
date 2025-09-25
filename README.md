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
