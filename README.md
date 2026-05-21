# 🍜 UdonFi - Giao Thức Web3 Lending Cao Cấp trên Stellar Soroban

Chào mừng bạn đến với **UdonFi**, một giao thức cho vay thế chấp phi tập trung (Decentralized Lending Protocol) tiên phong được xây dựng dành riêng cho hệ sinh thái **Stellar Soroban Smart Contracts**. 

UdonFi kết hợp các mô hình toán học tài chính Web3 tiêu chuẩn (như Kinked APY Curve, LTV, Liquidation Threshold, Health Factor) với các giải pháp kỹ thuật tối ưu hóa Ledger lưu trữ và CPU Instructions đặc thù của Soroban VM (như u128 Bitmap Matrix, 2-Step Liquidation, và TTL Storage Management).

Dự án đi kèm một giao diện người dùng **Vite + React + TypeScript** cao cấp mang phong cách **Glassmorphism & Cyberpunk Neon**, đem lại trải nghiệm tương tác Web3 mượt mà và trực quan nhất.

---

## 📐 1. Các Chỉ Số Tài Chính & Mô Hình Toán Học Cốt Lõi

UdonFi áp dụng các chuẩn mực toán học tài chính phi tập trung nghiêm ngặt để đảm bảo an toàn vốn và quản trị rủi ro thanh khoản tự động:

### A. Quản Trị Rủi Ro (LTV & Ngưỡng Thanh Lý)

*   **Tỷ lệ thế chấp (LTV - Loan-To-Value)**: Giới hạn phần trăm giá trị được vay tối đa trên tổng giá trị tài sản thế chấp đang có.
    $$\text{LTV Max} = 70\%$$
    *Khoản vay sẽ bị từ chối ngay từ khâu mô phỏng trên giao thức nếu tổng giá trị nợ vượt quá 70% giá trị tài sản thế chấp.*
*   **Ngưỡng thanh lý (Liquidation Threshold - LT)**: Giới hạn an toàn tối đa cho phép của tỷ lệ Nợ/Thế chấp.
    $$\text{LT} = 82.5\%$$
*   **Hệ số Sức khỏe (Health Factor - HF)**: Thước đo trạng thái an toàn của vị thế vay, được tính bằng công thức:
    $$HF = \frac{\sum (\text{Giá trị Tài sản Thế chấp}_i \times \text{Ngưỡng thanh lý}_i)}{\sum \text{Giá trị Khoản vay}_j}$$
    *   **$HF > 1.5$**: Trạng thái **An Toàn** (Màu xanh).
    *   **$1.0 \le HF \le 1.5$**: Trạng thái **Rủi Ro Cao** (Màu vàng), cảnh báo người dùng cần nạp thêm thế chấp hoặc trả bớt nợ.
    *   **$HF < 1.0$**: Trạng thái **Thanh Lý** (Màu đỏ). Vị thế nợ bị khóa và kích hoạt quyền thanh lý tài sản thế chấp.

---

### B. Thuật Toán Lãi Suất Gấp Khúc (Kinked Interest Rate Curve)

Để khuyến khích thanh khoản và bảo vệ pool khi nguồn vốn cạn kiệt, UdonFi áp dụng mô hình lãi suất vay biến thiên theo tỷ lệ sử dụng quỹ ($U$ - Utilization Rate):
$$U = \frac{\text{Tổng số tiền cho vay (Borrowed)}}{\text{Tổng số tiền nạp vào (Supplied)}}$$

Công thức tính lãi suất vay **Borrow APY** ($R_t$) được chia làm 2 giai đoạn tại điểm gấp khúc $U_{optimal}$:
1.  **Khi $U \le U_{optimal}$ (Nguồn vốn dồi dào, $U_{optimal} = 80\%$)**:
    $$R_t = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
    *Lãi suất tăng chậm để kích thích người dùng vay vốn (ví dụ: tăng từ $1\%$ lên $5\%$).*
2.  **Khi $U > U_{optimal}$ (Nguồn vốn khan hiếm)**:
    $$R_t = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$
    *Lãi suất tăng phi mã (lên đến $90\%$) để phạt người vay, buộc họ trả nợ và kêu gọi người gửi tiền nạp thêm để cứu vớt thanh khoản của hệ thống.*

**Lãi suất nạp (Supply APY)** được tính dựa trên lãi suất vay thu được từ người đi vay nhân với tỷ lệ sử dụng và trừ đi phí dự phòng (Reserve Factor = 10%):
$$\text{Supply APY} = R_t \times U \times (1 - \text{Reserve Factor})$$

---

## 🛠️ 2. Các Giải Pháp Kỹ Thuật Tối Ưu Đặc Thù Soroban

Blockchain Stellar Soroban sở hữu các đặc tính độc đáo về bộ nhớ lưu trữ và năng lượng CPU. UdonFi đã thiết kế những giải pháp đột phá để tối ưu hóa hiệu năng:

### A. Lưới Matrix u128 Bitmap Trạng Thái

Thay vì lưu trữ danh sách tài sản thế chấp và nợ của người dùng dưới dạng mảng (Vector) hoặc bản đồ (Map) tiêu tốn rất nhiều dung lượng bộ nhớ (Storage Fees) và gas để đọc ghi, UdonFi nén toàn bộ trạng thái tài khoản vào **một biến `u128` duy nhất**:
*   Mỗi tài sản trong giao thức chiếm **2 bit**:
    *   **Bit $2i$**: Cờ thế chấp (Collateral Flag) của tài sản thứ $i$ (ví dụ: XLM thế chấp là Bit 0).
    *   **Bit $2i + 1$**: Cờ nợ (Borrow Flag) của tài sản thứ $i$ (ví dụ: XLM nợ là Bit 1).
*   Thao tác kiểm tra hoặc cập nhật trạng thái được thực hiện thông qua các phép toán bitwise cực kỳ nhanh:
    *   *Bật thế chấp*: `bitmap |= (1 << 2i)`
    *   *Kiểm tra nợ*: `(bitmap >> (2i + 1)) & 1 == 1`
*   Giải pháp này giúp tiết kiệm **95% chi phí lưu trữ** trên Ledger Soroban.

### B. Quy Trình Thanh Lý 2 Bước (2-Step Liquidation)

Soroban giới hạn năng lượng CPU tối đa cho mỗi giao dịch là **100 triệu Instructions**. Một giao dịch thanh lý đơn lẻ truyền thống (vừa đọc Oracle, cập nhật lãi suất tích lũy, tính Health Factor, chuyển nợ, tịch thu thế chấp) thường ngốn từ **100M - 120M CPU instructions** khiến giao dịch bị máy ảo revert lập tức.

UdonFi giải quyết vấn đề này bằng mô hình **Thanh lý 2 bước phi tập trung**:
1.  **Bước 1: prepare_liquidation() (~60 triệu CPU instructions)**:
    *   Người thanh lý (Liquidator) gọi hàm để đăng ký phiên thanh lý.
    *   Hợp đồng khóa tài sản thế chấp của người đi vay bị nợ xấu, sinh một mã phiên (Session ID) độc nhất lưu trên Ledger.
2.  **Bước 2: execute_liquidation() (~30 triệu CPU instructions)**:
    *   Liquidator thực hiện nạp tiền trả nợ thay cho người vay bị thanh lý dựa trên Session ID đã đăng ký.
    *   Hệ thống chuyển giao tài sản thế chấp kèm **5% Bonus thưởng thanh lý** cho Liquidator và giải phóng phiên.
*   **Tổng CPU cho mỗi bước hoàn toàn dưới 100M**, giúp hoạt động thanh lý diễn ra trơn tru mà không bị chặn bởi cơ chế giới hạn của Soroban VM.

### C. Quản Lý Thời Gian Sống Dữ Liệu (TTL State Storage)

Để chống phình sổ cái, Soroban quy định mọi dữ liệu lưu trữ đều có bộ đếm ngược thời gian sống (TTL) tính theo số block ledger. Dữ liệu của UdonFi tự động decay (giảm dần) theo thời gian.
*   Khi TTL chạm 0, dữ liệu số dư tài khoản sẽ bị **evict (trục xuất)** khỏi Ledger.
*   UdonFi tích hợp cơ chế tự động **gia hạn TTL (extend_ttl)** lên tối đa 6,000 ledgers mỗi khi người dùng có hành động nạp/vay/trả nhằm duy trì trạng thái lưu trữ vĩnh viễn với chi phí tối ưu.

---

## 📂 3. Cấu Trúc Mã Nguồn Dự Án

Thư mục dự án được tổ chức rõ ràng thành 3 phần chính:

```text
UdonFi/
├── contracts/               # Mã nguồn Smart Contracts (Rust)
│   ├── lending_pool/        # Hợp đồng lõi quản lý tiền nạp, vay và APY
│   ├── liquidation/         # Hợp đồng quản lý thanh lý 2 bước (Prepare/Execute)
│   ├── reserve/             # Hợp đồng quản lý cấu hình các Reserve tài sản
│   ├── price_oracle/        # Trình giả lập nguồn giá Oracle XLM/USDC
│   ├── a_token/             # Token đại diện tài sản nạp (tích lũy lãi động)
│   └── debt_token/          # Token đại diện khoản nợ (tích lũy lãi vay)
│
├── indexer_bot/             # Bot NodeJS lập chỉ mục sự kiện on-chain Soroban
│
├── frontend/                # Ứng dụng giao diện Web3 cao cấp (React + TS + Vite)
│   ├── src/
│   │   ├── types/           # Định nghĩa Type-safety rõ ràng cho dữ liệu Web3
│   │   ├── components/      # Các component giao diện tinh xảo (Header, Gauge, Bitmap, Kinked SVG...)
│   │   ├── App.tsx          # State quản lý trung tâm và công cụ tính toán lãi suất real-time
│   │   └── index.css        # Hệ thống CSS Design Tokens (Glassmorphism & Neon Glow)
│   └── vite.config.ts       # Cấu hình build & phát triển Vite
│
└── README.md                # Tài liệu hướng dẫn tổng quan dự án (File này)
```

---

## 🚀 4. Hướng Dẫn Cài Đặt & Chạy Dự Án

### A. Yêu Cầu Hệ Thống
*   [Node.js](https://nodejs.org/) v18 trở lên.
*   [Rust & Cargo](https://www.rust-lang.org/) (để compile và kiểm thử Smart Contracts).
*   [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup) (nếu muốn deploy lên Soroban Testnet).

---

### B. Khởi Chạy Frontend (React + TypeScript + Vite)

Dự án Frontend đã được cài đặt và tối ưu hóa hoàn chỉnh. Bạn chỉ cần chạy các lệnh sau để khởi chạy cục bộ:

1.  **Di chuyển vào thư mục frontend**:
    ```bash
    cd frontend
    ```
2.  **Cài đặt dependencies**:
    ```bash
    npm install
    ```
3.  **Khởi chạy máy chủ phát triển (Development Server)**:
    ```bash
    npm run dev
    ```
    *Máy chủ sẽ được mở tại: [http://localhost:5174/](http://localhost:5174/) (hoặc [http://localhost:5173/](http://localhost:5173/)).*
4.  **Biên dịch tối ưu hóa (Production Build)**:
    ```bash
    npm run build
    ```

---

### C. Biên Dịch & Kiểm Thử Smart Contracts (Rust)

1.  **Di chuyển vào thư mục contracts**:
    ```bash
    cd contracts
    ```
2.  **Compile toàn bộ hợp đồng Soroban**:
    ```bash
    cargo build --target wasm32-unknown-unknown --release
    ```
3.  **Chạy các unit test toán học và logic thanh lý**:
    ```bash
    cargo test
    ```

---

### D. Khởi Chạy Indexer Bot (NodeJS)

1.  **Di chuyển vào thư mục indexer_bot**:
    ```bash
    cd indexer_bot
    ```
2.  **Cài đặt các gói phụ thuộc và chạy bot**:
    ```bash
    npm install
    npm start
    ```

---

## 🎨 5. Điểm Nhấn Trải Nghiệm Giao Diện Premium (UX/UI Showcases)

*   **Tô Mì UdonFi Bốc Khói**: Biểu tượng tô mì Udon bốc khói neon đổi sắc gradient ở góc trái màn hình được vẽ thuần bằng CSS kết hợp animation cực kỳ độc đáo.
*   **Lưới 128-bit Bitmap**: Một ma trận LED hiển thị trạng thái bit-packing của Ledger. Nhấp chọn bit bất kỳ để đọc giải nghĩa logic bitwise và nhấn click để mô phỏng lật bit (toggle).
*   **Biểu Đồ Lãi Suất Gấp Khúc SVG**: Biểu đồ tự vẽ bằng SVG, chấm xanh lá thể hiện tỉ lệ Utilization $U$ sẽ chạy lướt dọc theo đường dốc gấp khúc cực kỳ trực quan khi bạn tương tác gửi/vay.
*   **Hệ Thống Trích Xuất Logs Giả Lập**: In ra chi tiết hoạt động của các lệnh giao dịch RPC Soroban ở thanh cuối màn hình giúp lập trình viên và người dùng hiểu rõ hoạt động phía sau hậu trường.

---

UdonFi mang đến một chuẩn mực mới trong thiết kế giao diện Web3 Lending tinh xảo và các giải pháp tối ưu hóa dữ liệu đỉnh cao cho Stellar Soroban!
