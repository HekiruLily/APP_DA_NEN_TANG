# Ứng dụng CHATAPP

Ứng dụng nhắn tin thời gian thực đa nền tảng được xây dựng bằng **React Native**, sử dụng **Firebase** (Authentication, Realtime Database) để đồng bộ tin nhắn/trạng thái và **Cloudinary** để lưu trữ/tải lên hình ảnh.

---

## 📌 Tính năng

- **Xác thực người dùng**: Đăng ký, đăng nhập tài khoản bằng Email & Mật khẩu (Firebase Auth).
- **Trò chuyện 1-1**:
  - Gửi & nhận tin nhắn thời gian thực.
  - Hiển thị trạng thái trực tuyến (Online/Offline) và thời gian hoạt động cuối (`lastSeen`).
  - Trạng thái đang gõ phím (`typing indicator`) và trạng thái đã xem (`seen status`).
  - Gửi hình ảnh (Cloudinary) và chia sẻ vị trí hiện tại (Google Maps).
  - Thả cảm xúc tin nhắn (Reactions: 👍, ❤️, 😂, 😮, 😢).
  - Thu hồi tin nhắn (`recall message`).
- **Trò chuyện nhóm**:
  - Tạo nhóm chat mới với tối thiểu 2 thành viên từ danh bạ.
  - Quản trị nhóm: Đổi tên nhóm, thêm thành viên mới, xóa thành viên khỏi nhóm (chỉ Trưởng nhóm).
  - Rời nhóm: Thành viên hoặc Trưởng nhóm rời nhóm sẽ tự động gửi tin nhắn hệ thống *"A đã rời nhóm"*.
  - Giải tán nhóm: Trưởng nhóm có quyền giải tán, xóa nhóm cho tất cả thành viên.
- **Trả lời tin nhắn cụ thể (Reply / Quote)**:
  - Nhấn giữ tin nhắn để chọn *"Trả lời"*.
  - Hiển thị thanh xem trước trích dẫn phía trên ô nhập liệu.
  - Nhấn vào khối trích dẫn trong bong bóng chat để **tự động cuộn đến tin nhắn gốc** và làm sáng (highlight) tin nhắn gốc.
- **Hồ sơ cá nhân**:
  - Chỉnh sửa họ tên và ảnh đại diện (chụp trực tiếp từ Máy ảnh hoặc chọn từ Thư viện).
  - Ảnh đại diện mới cập nhật đồng bộ tức thì trên **Danh bạ**, **Trang chủ** và **Phòng chat**.

---

## Hướng dẫn cấu hình Firebase

Ứng dụng sử dụng **Firebase Authentication** và **Firebase Realtime Database**. Thực hiện các bước sau để thiết lập:

### Bước 1: Tạo dự án Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/) và đăng nhập tài khoản Google.
2. Nhấn **Add project** (Thêm dự án), nhập tên dự án (ví dụ: `ChatApp`) và hoàn tất các bước tạo dự án.

### Bước 2: Kích hoạt Firebase Authentication
1. Tại menu bên trái, chọn **Build** ➔ **Authentication**.
2. Nhấn **Get Started** (Bắt đầu).
3. Tại tab **Sign-in method**, chọn nhà cung cấp **Email/Password**.
4. Bật công tắc **Enable** (chỉ cần bật dòng đầu tiên, không bắt buộc Email link) ➔ Nhấn **Save**.

### Bước 3: Tạo Realtime Database
1. Tại menu bên trái, chọn **Build** ➔ **Realtime Database**.
2. Nhấn **Create Database** (Tạo cơ sở dữ liệu).
3. Chọn vị trí lưu trữ (khuyến nghị chọn khu vực gần Việt Nam như **Singapore - `asia-southeast1`**).
4. Chọn chế độ bảo mật **Start in locked mode** ➔ Nhấn **Enable**.

### Bước 4: Cập nhật Security Rules (Quy tắc bảo mật)
1. Trong trang Realtime Database, chọn tab **Rules** (Quy tắc).
2. Sao chép toàn bộ nội dung JSON dưới đây và dán thay thế toàn bộ quy tắc hiện tại:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },

    "conversations": {
      "$convId": {
        ".read": "auth != null && (data.child('members/' + auth.uid).val() === true || (!data.exists() && $convId.contains(auth.uid)))",
        ".write": "auth != null && (
          (!data.exists() && (newData.child('members/' + auth.uid).val() === true || $convId.contains(auth.uid))) ||
          (data.exists() && (data.child('members/' + auth.uid).val() === true || data.child('createdBy').val() === auth.uid))
        )"
      }
    },

    "messages": {
      "$convId": {
        ".read": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || (!root.child('conversations/' + $convId).exists() && $convId.contains(auth.uid)))",
        ".write": "auth != null && (!newData.exists() && root.child('conversations/' + $convId + '/createdBy').val() === auth.uid)",
        "$msgId": {
          ".write": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || root.child('conversations/' + $convId + '/createdBy').val() === auth.uid || $convId.contains(auth.uid)) && (
            (!data.exists() && (newData.child('senderId').val() === auth.uid || newData.child('senderId').val() === 'system')) ||
            (data.exists() && data.child('senderId').val() === auth.uid && newData.child('recalled').val() === true)
          )",
          "reactions": {
            "$uid": {
              ".write": "auth != null && auth.uid === $uid && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || $convId.contains(auth.uid))"
            }
          }
        }
      }
    },

    "typing": {
      "$convId": {
        ".read": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || (!root.child('conversations/' + $convId).exists() && $convId.contains(auth.uid)))",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || root.child('conversations/' + $convId + '/createdBy').val() === auth.uid || $convId.contains(auth.uid))"
        }
      }
    },

    "readStatus": {
      "$convId": {
        ".read": "auth != null && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || (!root.child('conversations/' + $convId).exists() && $convId.contains(auth.uid)))",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true || root.child('conversations/' + $convId + '/createdBy').val() === auth.uid || $convId.contains(auth.uid))"
        }
      }
    },

    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$convId": {
          ".write": "auth != null && (
            auth.uid === $uid ||
            root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true ||
            root.child('conversations/' + $convId + '/createdBy').val() === auth.uid ||
            $convId.contains(auth.uid)
          )"
        }
      }
    },

    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$notifId": {
          ".write": "auth != null && (auth.uid === $uid || (!data.exists() && newData.child('fromUid').val() === auth.uid))"
        }
      }
    },

    "activeChat": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```
3. Nhấn nút **Publish** (Xuất bản) để lưu các quy tắc bảo mật.

### Bước 5: Cấu hình Firebase vào mã nguồn
1. Tại màn hình chính của Firebase Console, chọn biểu tượng bánh răng ⚙️ ➔ **Project settings** (Cài đặt dự án).
2. Tại tab **General**, cuộn xuống phần **Your apps** ➔ Nhấn biểu tượng Web (`</>`) để đăng ký ứng dụng Web.
3. Đặt tên gợi nhớ cho ứng dụng và nhấn **Register app**.
4. Sao chép đối tượng `firebaseConfig` và dán vào file [`src/services/firebase.ts`](src/services/firebase.ts):

```typescript
// src/services/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  databaseURL: "https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## ☁️ Hướng dẫn cấu hình Cloudinary

Ứng dụng tải ảnh lên Cloudinary qua cơ chế **Unsigned Upload** (không cần lộ API Secret trên ứng dụng di động).

### Bước 1: Đăng ký tài khoản Cloudinary
1. Truy cập [Cloudinary](https://cloudinary.com/) và đăng ký tài khoản miễn phí.
2. Đăng nhập vào trang quản trị [Cloudinary Console](https://console.cloudinary.com/).

### Bước 2: Lấy Cloud Name
1. Tại trang **Dashboard**, sao chép giá trị **Cloud Name** (ví dụ: `abubl1yi` hoặc tên bạn đã đặt khi đăng ký).

### Bước 3: Tạo Upload Preset (Unsigned)
1. Nhấn vào biểu tượng bánh răng **Settings ⚙️** ở góc dưới bên trái màn hình.
2. Chọn mục **Upload** từ menu cài đặt.
3. Cuộn xuống phần **Upload presets** ➔ Nhấn **Add upload preset**.
4. Cấu hình các thông số:
   - **Upload preset name**: Đặt tên preset (ví dụ: `ChatApp`).
   - **Signing Mode**: Chuyển từ `Signed` sang **`Unsigned`** *(bắt buộc để ứng dụng upload ảnh trực tiếp)*.
   - **Folder** *(Tùy chọn)*: Nhập thư mục lưu ảnh (ví dụ: `chat_app_media`).
5. Nhấn nút **Save** ở góc trên bên phải để hoàn tất.

### Bước 4: Cấu hình vào mã nguồn
Mở file [`src/services/uploadService.ts`](src/services/uploadService.ts) và điền `CLOUD_NAME` cùng `UPLOAD_PRESET` vừa tạo:

```typescript
// src/services/uploadService.ts
const CLOUD_NAME = 'abubl1yi';      // Thay bằng Cloud Name của bạn
const UPLOAD_PRESET = 'ChatApp';    // Thay bằng Upload Preset vừa tạo
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
```

---

## Cài đặt và khởi chạy

### Yêu cầu môi trường
- **Node.js**: >= 18
- **JDK**: Eclipse Temurin JDK 17
- **Android Studio** & Android SDK (API 34 hoặc 35)

### Các bước khởi chạy

1. **Cài đặt thư viện phụ thuộc**:
   ```bash
   cd APP_DA_NEN_TANG
   npm install
   ```

2. **Khởi chạy máy chủ Metro**:
   ```bash
   npx react-native start
   ```

3. **Chạy ứng dụng trên máy ảo hoặc thiết bị Android**:
   ```bash
   npx react-native run-android
   ```

4. **Kiểm tra typecheck**:
   ```bash
   npx tsc --noEmit
   ```

---

## 📁 Cấu trúc thư mục

```text
APP_DA_NEN_TANG/
├── database.rules.json         # Quy tắc bảo mật Firebase Realtime Database
├── src/
│   ├── context/
│   │   └── AppContext.tsx      # Quản lý State toàn cục (User, Chats, Notifications)
│   ├── navigation/
│   │   └── RootNavigator.tsx   # Điều hướng màn hình (Stack & Bottom Tabs)
│   ├── screens/
│   │   ├── LoginScreen.tsx        # Đăng nhập
│   │   ├── RegisterScreen.tsx     # Đăng ký
│   │   ├── HomeScreen.tsx         # Danh sách các cuộc trò chuyện
│   │   ├── ContactsScreen.tsx     # Danh bạ người dùng
│   │   ├── ChatDetailScreen.tsx   # Phòng chat (1-1, Nhóm, Reply, Quản trị nhóm)
│   │   ├── CreateGroupScreen.tsx  # Tạo nhóm trò chuyện mới
│   │   ├── NotificationsScreen.tsx# Danh sách thông báo
│   │   └── SettingsScreen.tsx     # Cài đặt & Chỉnh sửa hồ sơ cá nhân
│   ├── services/
│   │   ├── firebase.ts            # Khởi tạo kết nối Firebase
│   │   ├── authService.ts         # Xác thực người dùng
│   │   ├── chatService.ts         # Xử lý tin nhắn 1-1, thu hồi, thả cảm xúc, typing
│   │   ├── groupService.ts        # Xử lý tạo nhóm, đổi tên, thêm/xóa thành viên, rời nhóm, giải tán
│   │   ├── notificationService.ts # Xử lý thông báo
│   │   ├── uploadService.ts       # Tải ảnh lên Cloudinary
│   │   └── locationService.ts     # Lấy vị trí GPS hiện tại
│   ├── types/
│   │   └── index.ts               # Định nghĩa các Interface & Types
│   └── theme/
│       └── colors.ts              # Bảng màu chủ đạo của ứng dụng
└── README.md
```

