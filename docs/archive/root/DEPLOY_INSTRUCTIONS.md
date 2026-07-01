# 🍜 Hướng Dẫn Triển Khai UdonFi Lending Protocol Lên Stellar Soroban Mainnet

Tài liệu này hướng dẫn chi tiết từng bước cách sử dụng kịch bản triển khai tự động `deploy_mainnet.js` để đẩy toàn bộ dự án UdonFi lên Stellar Soroban Mainnet bằng ví chứa **110 XLM** (`GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X`) của bạn.

---

## 📋 Điều Kiện Tiên Quyết (Prerequisites)

Hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
1. **Rust & Cargo** (Để biên dịch Smart Contracts).
2. **Stellar CLI v26.0.0+** (Để tương tác với mạng lưới Stellar/Soroban).
3. **NodeJS v18+** (Để chạy kịch bản deploy bằng Javascript).
4. **Ví Mainnet đã được nạp tiền:** Địa chỉ ví `GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X` chứa ít nhất **100 XLM** (Đã được chuẩn bị sẵn).

---

## 🛠️ Quy Trình Thực Hiện 4 Bước

### Bước 1: Biên Dịch Các Hợp Đồng Thông Minh Rust
Mở terminal trong thư mục `contracts` và chạy lệnh sau để biên dịch lại mã nguồn sang WebAssembly (WASM) phiên bản release:
```bash
cd contracts
cargo build --target wasm32v1-none --release
cd ..
```
*Lưu ý: Quá trình biên dịch sẽ tạo ra các tệp tin `.wasm` thô trong thư mục `contracts/target/wasm32v1-none/release/`.*

---

### Bước 2: Nhập Ví Mainnet Của Bạn Vào Stellar CLI
Bạn cần đưa ví mainnet chứa XLM vào cơ chế lưu trữ của Stellar CLI dưới tên định danh `mainnet_admin`:

1. Chạy câu lệnh sau:
   ```bash
   stellar keys add mainnet_admin
   ```
2. Terminal sẽ yêu cầu bạn nhập khóa bí mật:
   ```text
   Enter secret key:
   ```
3. Dán (paste) **Secret Key** (Khóa bảo mật bắt đầu bằng chữ **`S`**) của ví `GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X` của bạn vào và nhấn **Enter**.
4. Kiểm tra xem ví đã được lưu chính xác chưa bằng cách chạy:
   ```bash
   stellar keys address mainnet_admin
   ```
   *Kết quả mong đợi: Trả về chính xác địa chỉ ví công khai `GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X`.*

---

### Bước 3: Kích Hoạt Script Triển Khai Tự Động Lên Mainnet
Tệp tin script tự động [deploy_mainnet.js](file:///d:/TheAnhProject/UdonFi/contracts/deploy_mainnet.js) đã được thiết lập để tự động hóa: tối ưu hóa WASM, deploy lên Mainnet, liên kết Reflector Oracle thực tế và khởi tạo tất cả các Reserve.

Hãy chạy câu lệnh sau tại thư mục gốc của dự án:

*   **Nếu sử dụng Windows PowerShell:**
    ```powershell
    $env:STELLAR_IDENTITY="mainnet_admin"; node contracts/deploy_mainnet.js
    ```
*   **Nếu sử dụng CMD hoặc Linux/macOS/Git Bash:**
    ```bash
    STELLAR_IDENTITY=mainnet_admin node contracts/deploy_mainnet.js
    ```

> ⚠️ **Lưu ý trong lúc deploy:** Kịch bản sẽ mất khoảng 1-2 phút vì cần thực hiện nhiều giao dịch liên tiếp trên Mainnet. Vui lòng không tắt terminal cho đến khi xuất hiện dòng chữ:
> **`🍜 UDONFI PROTOCOL DEPLOYED SUCCESSFULLY TO MAINNET!`** kèm danh sách các Contract ID mới.

---

### Bước 4: Cập Nhật Mã Nguồn Ứng Dụng (Frontend & Indexer)

Sau khi deploy thành công, terminal sẽ trả về danh sách các Contract ID mới. Hãy cập nhật chúng vào các file cấu hình sau để hệ thống chạy thực tế trên Mainnet:

#### 1. Cấu hình Frontend ([App.tsx](file:///d:/TheAnhProject/UdonFi/frontend/src/App.tsx))
Mở file `frontend/src/App.tsx` và thực hiện các cập nhật sau:
- **Cập nhật Contract ID (Dòng 30):**
  ```typescript
  const POOL_CONTRACT_ID = 'ĐỊA_CHỈ_POOL_CONTRACT_ID_MỚI_IN_RA';
  ```
- **Cập nhật Soroban RPC URL (Dòng 31):**
  ```typescript
  const RPC_URL = 'https://soroban-mainnet.stellar.org';
  ```
- **Tắt tính năng Auto-Reset:** Tìm và chuyển biến trạng thái `autoResetEnabled` sang mặc định là `false` để tránh kích hoạt lại script deploy testnet.
- **Chuyển Wallet mạng lưới sang Public (Mainnet):** Tìm dòng code ký giao dịch bằng Freighter và đổi passphrase từ `StellarSdk.Networks.TESTNET` thành `StellarSdk.Networks.PUBLIC`.

#### 2. Cấu hình Indexer Bot ([index.js](file:///d:/TheAnhProject/UdonFi/indexer_bot/index.js))
Mở file `indexer_bot/index.js` và thực hiện cập nhật:
- **Cập nhật Contract ID (Dòng 12):**
  ```javascript
  const POOL_CONTRACT_ID = 'ĐỊA_CHỈ_POOL_CONTRACT_ID_MỚI_IN_RA';
  ```
- **Cập nhật RPC URL (Dòng 13):**
  ```javascript
  const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-mainnet.stellar.org';
  ```
- **Cập nhật các địa chỉ SAC của tài sản (XLM & USDC):** Đảm bảo hàm `mapAssetSymbol` mapping đúng các contract ID mainnet (`CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA` cho XLM và `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` cho USDC).

---

## 🚀 Chạy Hệ Thống Trên Môi Trường Mainnet

Sau khi cấu hình xong, bạn có thể khởi chạy lại toàn bộ hệ thống để người dùng bắt đầu tương tác trên Stellar Mainnet:

1. **Khởi động Bot Indexer để theo dõi sự kiện thực tế:**
   ```bash
   cd indexer_bot
   npm install
   npm start
   ```
2. **Khởi động Frontend Client:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

*Chúc mừng! Dự án UdonFi của bạn đã sẵn sàng hoạt động thương mại trên Stellar Soroban Mainnet.*
