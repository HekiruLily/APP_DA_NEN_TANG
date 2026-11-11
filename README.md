# HƯỚNG DẪN CẤU HÌNH VÀ CHẠY DỰ ÁN CHAT APP - BÀI THỰC HÀNH 6
**Môn học:** Phát triển ứng dụng đa nền tảng  
**Công nghệ:** React Native CLI, Firebase Realtime Database, Cloudinary Unsigned Upload  

---

## 1. CẤU HÌNH FIREBASE

### 1.1. Cấu hình Realtime Database Rules
1. Mở **[Firebase Console](https://console.firebase.google.com/)** $\to$ Chọn dự án của bạn.
2. Vào **Realtime Database** $\to$ Chọn tab **Rules**.
3. Sao chép toàn bộ nội dung file `database.rules.json` trong thư mục dự án và dán vào, sau đó nhấn **Publish**:

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
        ".read": "auth != null && data.child('members/' + auth.uid).val() === true",
        ".write": "auth != null && (
          (!data.exists() && newData.child('members/' + auth.uid).val() === true) ||
          (data.exists() && data.child('members/' + auth.uid).val() === true)
        )"
      }
    },
    "messages": {
      "$convId": {
        ".read": "auth != null && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true",
        "$msgId": {
          ".write": "auth != null && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true && (
            (!data.exists() && newData.child('senderId').val() === auth.uid) ||
            (data.exists() && data.child('senderId').val() === auth.uid && newData.child('recalled').val() === true)
          )",
          "reactions": {
            "$uid": {
              ".write": "auth != null && auth.uid === $uid && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true"
            }
          }
        }
      }
    },
    "typing": {
      "$convId": {
        ".read": "auth != null && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true"
        }
      }
    },
    "readStatus": {
      "$convId": {
        ".read": "auth != null && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true"
        }
      }
    },
    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$convId": {
          ".write": "auth != null && (
            auth.uid === $uid ||
            root.child('conversations/' + $convId + '/members/' + auth.uid).val() === true
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

---

## 2. CẤU HÌNH CLOUDINARY (UNSIGNED UPLOAD PRESET)

Ứng dụng tải ảnh trực tiếp qua REST API lên Cloudinary với Unsigned Upload Preset (không lưu API Secret trong mã nguồn để đảm bảo bảo mật):

- **Cloud Name**: `abubl1yi`
- **Upload Preset**: `ChatApp` (Signing Mode: `Unsigned`)
- **Tập tin cấu hình**: `src/services/uploadService.ts`
- **Tối ưu hóa ảnh**: Giới hạn kích thước cạnh dài $\le 1024$px trước khi tải lên (`maxWidth: 1024, maxHeight: 1024, quality: 0.8`).

---

## 3. CÁC TÍNH NĂNG ĐÃ TRIỂN KHAI

### Phần A: Bắt buộc (8 điểm)
1. **Trạng thái cuộc trò chuyện (1.5 điểm)**:
   - Hiển thị `"đang soạn tin…"` theo thời gian thực khi đối phương gõ; tự tắt sau 3 giây hoặc khi gửi tin / rời màn hình.
   - Tin cuối cùng hiển thị `"Đã gửi"` hoặc `"Đã xem · HH:mm"` (thời gian xem).
   - Khi đối phương offline, hiển thị `"Hoạt động X phút trước"`, `"Hoạt động X giờ trước"`, hoặc `"Hoạt động vừa xong"`.
   - Sử dụng `onDisconnect()` của Realtime Database để tránh kẹt trạng thái online và typing khi app tắt đột ngột.
2. **Thu hồi và tương tác với tin nhắn (1.5 điểm)**:
   - Nhấn giữ tin nhắn để mở menu: Sao chép, Thu hồi (chỉ với tin của mình), Thả cảm xúc (`👍 ❤️ 😂 😮 😢`).
   - Tin đã thu hồi hiển thị `"Tin nhắn đã được thu hồi"` trên mọi máy (`recalled: true`).
   - Cập nhật dòng tin cuối ở màn hình Home khi tin cuối bị thu hồi.
   - Cảm xúc hiển thị dưới dạng badge kèm số lượng nếu nhiều người cùng thả.
3. **Gửi ảnh (2.0 điểm)**:
   - Nút 📷 với 2 tùy chọn: Chụp ảnh mới hoặc Chọn từ thư viện (`react-native-image-picker`).
   - Xin quyền camera (`PermissionsAndroid`).
   - Thu nhỏ ảnh cạnh dài $\le 1024$px và tải lên Cloudinary.
   - Bong bóng tạm hiển thị hình ảnh preview kèm vòng xoay loading. Nếu tải lỗi có nút **"Thử lại"** và **"Hủy"**.
   - Nhấn vào ảnh để xem toàn màn hình.
   - Ở màn hình Home, tin cuối là ảnh hiển thị `"📷 Hình ảnh"`, tin cuối là vị trí hiển thị `"📍 Vị trí"`.
4. **Chat nhóm (2.0 điểm)**:
   - Màn hình Tạo nhóm với ô đặt tên nhóm và danh sách chọn thành viên có checkbox (tối thiểu 2 người ngoài bản thân).
   - Trong nhóm, tin của người khác hiển thị tên người gửi phía trên bong bóng.
   - Tiêu đề nhóm hiển thị tên nhóm và số thành viên đang online (`X thành viên · Y online`).
   - Màn hình Home hiển thị đồng thời cả chat 1-1 và chat nhóm, sắp xếp theo tin mới nhất, mỗi thành viên có số tin chưa đọc riêng.
5. **Màn hình Thông báo thật (1.0 điểm)**:
   - Tự động ghi thông báo vào `notifications/{uid}` khi:
     - Có tin mới mà người dùng không ở trong cuộc trò chuyện đó (dựa vào `activeChat/{uid}`).
     - Được thêm vào nhóm mới.
     - Có người thả cảm xúc vào tin của mình.
   - Tab Thông báo có badge hiển thị số thông báo chưa đọc.
   - Nhấn vào thông báo sẽ mở đúng cuộc trò chuyện và đánh dấu đã đọc.
   - Có nút **"Đánh dấu tất cả đã đọc"**.

### Phần B: Yêu cầu kỹ thuật
- Ghi tin nhắn, lastMessage và tăng unread bằng `increment(1)` trong **MỘT LỆNH `update()` multi-path update**.
- Tải tin nhắn phân trang: 20 tin mới nhất (`limitToLast(20)`), kéo lên tải thêm 20 tin cũ hơn không bị nhảy danh sách.
- Hủy toàn bộ listener trong hàm cleanup của `useEffect`.
- Gom mã nguồn logic vào thư mục `src/services/` (`chatService.ts`, `groupService.ts`, `uploadService.ts`, `notificationService.ts`).

---

## 4. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY ỨNG DỤNG

### Bước 1: Cài đặt dependencies
```bash
npm install
```

### Bước 2: Khởi động Metro Bundler
```bash
npm start
```

### Bước 3: Chạy ứng dụng trên thiết bị Android / máy ảo
```bash
npm run android
```
