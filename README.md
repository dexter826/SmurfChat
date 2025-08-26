# 🚀 SmurfChat - Ứng dụng Chat thời gian thực

## 📋 Mô tả

SmurfChat là một ứng dụng chat thời gian thực được xây dựng bằng React và Firebase, cho phép người dùng tạo phòng chat, gửi tin nhắn và tương tác với nhau.

## ✨ Tính năng chính

- 🔐 Đăng nhập/Đăng ký với Email
- 💬 Chat thời gian thực
- 🏠 Tạo và quản lý phòng chat
- 👥 Mời thành viên vào phòng
- 📱 Responsive design
- 🎨 Giao diện đẹp với Ant Design

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 17, Ant Design 4
- **Backend**: Firebase 9 (Firestore, Authentication)
- **Styling**: Styled Components
- **Build Tool**: Create React App 5

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js 14+
- npm hoặc yarn

### Bước 1: Clone dự án

```bash
git clone <repository-url>
cd SmurfChat
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

### Bước 3: Cấu hình Firebase

1. Tạo Firebase project mới tại [Firebase Console](https://console.firebase.google.com/)
2. Bật Authentication (Email/Password)
3. Tạo Firestore Database
4. Cập nhật thông tin cấu hình trong `src/firebase/config.js`

Xem chi tiết trong file [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### Bước 4: Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại http://localhost:3000

## 📁 Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── ChatRoom/       # Components cho chat room
│   ├── Login/          # Components đăng nhập
│   └── Modals/         # Modal components
├── Context/            # React Context providers
├── firebase/           # Firebase configuration
├── hooks/              # Custom React hooks
└── App.js              # Component chính
```

## 🔧 Scripts có sẵn

- `npm start` - Chạy ứng dụng ở chế độ development
- `npm run build` - Build ứng dụng cho production
- `npm test` - Chạy tests
- `npm run eject` - Eject từ Create React App

## 📱 Firebase Emulators (Tùy chọn)

Để sử dụng Firebase emulators cho development:

```bash
cd emulators
firebase emulators:start
```

## 🚀 Deploy

```bash
npm run build
```

Thư mục `build/` sẽ chứa các file production-ready.

## 📝 Lưu ý

- Đây là đồ án môn học, không phải production app
- Các package đã được cập nhật để đảm bảo tương thích
- Firebase project cần được tạo mới (project cũ đã bị xóa)

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

## 📄 License

MIT License
