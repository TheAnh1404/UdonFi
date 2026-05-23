# 🍜 UdonFi — Giao Thức Lending Web3 Hiệu Năng Cao & Cao Cấp trên Stellar Soroban

[![Stellar Soroban](https://img.shields.io/badge/Stellar-Soroban-black?style=for-the-badge&logo=stellar&logoColor=white&color=080C1C)](https://soroban.stellar.org/)
[![Rust Smart Contracts](https://img.shields.io/badge/Rust-Contracts-orange?style=for-the-badge&logo=rust&logoColor=white&color=DE7F3E)](https://www.rust-lang.org/)
[![Vite React TS](https://img.shields.io/badge/Vite_React_TS-Frontend-blue?style=for-the-badge&logo=vite&logoColor=white&color=00F2FE)](https://vitejs.dev/)
[![Node.js Indexer](https://img.shields.io/badge/Node.js-Indexer-green?style=for-the-badge&logo=nodedotjs&logoColor=white&color=21A366)](https://nodejs.org/)
[![Firebase Status](https://img.shields.io/badge/Firebase-Realtime-yellow?style=for-the-badge&logo=firebase&logoColor=white&color=FFCA28)](https://firebase.google.com/)

---

## 🌟 Tóm Tắt Dự Án & Kiến Trúc Hệ Thống Tổng Quan

**UdonFi** là một giao thức cho vay thế chấp phi tập trung (Decentralized Lending Protocol) tiên phong thế hệ mới được xây dựng dành riêng cho hệ sinh thái **Stellar Soroban Smart Contracts**. Nhằm giải quyết triệt để cả hai bài toán: hiệu quả tối ưu hóa dòng vốn và các giới hạn phần cứng đặc thù của blockchain, UdonFi kết hợp các mô hình toán học tài chính Web3 tiêu chuẩn (như Kinked APY Curve, LTV, Liquidation Threshold, Health Factor) với các giải pháp kỹ thuật tối ưu hóa Ledger lưu trữ và CPU Instructions đặc thù của Soroban VM (như u128 Bitmap Matrix, 2-Step Liquidation, và TTL Storage Management).

Dự án đi kèm một giao diện người dùng **Vite + React + TypeScript** cao cấp mang phong cách **Glassmorphism & Cyberpunk Neon**, đem lại trải nghiệm tương tác Web3 mượt mà, trực quan và hiện đại bậc nhất.

```text
                               LUỒNG HOẠT ĐỘNG HỆ THỐNG UDONFI
                                     
      ┌─────────────────────────────────────────────────────────────────────────────────┐
      │                                 Stellar Network                                 │
      │                                                                                 │
      │   ┌────────────────────┐      Sự kiện On-Chain  ┌───────────────────────────┐   │
      │   │  Smart Contracts   │ ─────────────────────> │     Indexer Bot (Node)    │   │
      │   │      (Rust)        │                        │                           │   │
      │   └────────┬───────────┘                        └─────────────┬─────────────┘   │
      └────────────┼──────────────────────────────────────────────────┼─────────────────┘
                   │                                                  │
           Truy vấn/Ghi RPC                                    Phát trạng thái
                   │                                                  │
                   │                                     ┌────────────┴─────────────┐
                   │                                     │                          │
                   │                                     ▼                          ▼
                   │                           ┌──────────────────┐       ┌──────────────────┐
                   │                           │  Firestore Live  │       │  Socket.io Push  │
                   │                           │     Database     │       │     (Realtime)   │
                   │                           └────────┬─────────┘       └────────┬─────────┘
                   ▼                                    │                          │
      ┌─────────────────────────────────────────────────┼──────────────────────────┼────┐
      │                                                 │                          │    │
      │   ┌─────────────────────────────────────────────▼──────────────────────────▼┐   │
      │   │                          Giao Diện Người Dùng UdonFi                    │   │
      │   │                (Ứng Dụng Client Vite + React + TypeScript)              │   │
      │   └─────────────────────────────────────────────────────────────────────────┘   │
      │                                                                                 │
      └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 1. Các Chỉ Số Tài Chỉ & Mô Hình Toán Học Cốt Lõi

UdonFi áp dụng các chuẩn mực toán học tài chính phi tập trung nghiêm ngặt để đảm bảo an toàn vốn và quản trị rủi ro thanh khoản tự động:

### A. Quản Trị Rủi Ro (LTV & Ngưỡng Thanh Lý)
*   **Tỷ lệ thế chấp tối đa ($LTV_{max} = 70\%$):** Giới hạn phần trăm giá trị được vay tối đa trên tổng giá trị tài sản thế chấp đang có. Khoản vay sẽ bị từ chối ngay từ khâu mô phỏng trên giao thức nếu tổng giá trị nợ vượt quá $70\%$ giá trị tài sản thế chấp.
*   **Ngưỡng thanh lý ($LT = 82.5\%$):** Giới hạn an toàn tối đa cho phép của tỷ lệ Nợ/Thế chấp.
*   **Hệ số Sức khỏe ($HF$ - Health Factor):** Thước đo trạng thái an toàn của vị thế vay, được tính bằng công thức:
    $$HF = \frac{\sum (\text{Giá trị Tài sản Thế chấp}_i \times LT_i)}{\sum \text{Giá trị Khoản vay}_j}$$
    *   **$HF > 1.5$ (Trạng thái An Toàn — Màu Xanh Neon):** Tỷ lệ thế chấp cực kỳ tốt. Hoàn toàn được bảo vệ trước các biến động giá ngắn hạn.
    *   **$1.0 \le HF \le 1.5$ (Trạng thái Rủi Ro Cao — Màu Vàng Cyber):** Cảnh báo người dùng cần nạp thêm thế chấp hoặc trả bớt nợ để tránh nguy cơ bị thanh lý.
    *   **$HF < 1.0$ (Trạng thái Thanh Lý — Màu Đỏ Warning):** Vị thế nợ bị khóa và kích hoạt quyền thanh lý tài sản thế chấp công khai.

---

### B. Thuật Toán Lãi Suất Gấp Khúc (Kinked Interest Rate Curve)
Để khuyến khích thanh khoản và bảo vệ pool khi nguồn vốn cạn kiệt, UdonFi áp dụng mô hình lãi suất vay biến thiên theo tỷ lệ sử dụng quỹ ($U$ - Utilization Rate):
$$U = \frac{\text{Tổng số tiền cho vay (Borrowed)}}{\text{Tổng số tiền nạp vào (Supplied)}}$$

Công thức tính lãi suất vay **Borrow APY** ($R_t$) được chia làm 2 giai đoạn tại điểm gấp khúc $U_{optimal}$ (ở mức $80\%$):

1.  **Giai đoạn 1 — Vốn Dồi Dào ($U \le 80\%$):**
    $$R_t = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
    *Lãi suất tăng chậm (ví dụ: tăng từ $1\%$ lên $5\%$) để kích thích người dùng vay vốn mở rộng vị thế.*

2.  **Giai đoạn 2 — Khan Hiếm Thanh Khoản ($U > 80\%$):**
    $$R_t = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$
    *Lãi suất tăng phi mã (lên đến $90\%$) để phạt người vay, buộc họ trả nợ và kêu gọi người gửi tiền nạp thêm để cứu vớt thanh khoản của hệ thống.*

**Lãi suất nạp (Supply APY)** được tính dựa trên lãi suất vay thu được từ người đi vay nhân với tỷ lệ sử dụng và trừ đi phí dự phòng (Reserve Factor = 10%):
$$\text{Supply APY} = R_t \times U \times (1 - \text{Reserve Factor})$$

```text
  Borrow APY (%)
   ▲
90 │                                                     /
   │                                                    /
   │                                                   / [Slope 2: Khủng hoảng thanh khoản]
   │                                                  /
   │                                                 /
 5 │                                  .-------------'
   │                      .----------'  [Kink tại 80%]
 1 │          .----------' [Slope 1]
   └──────────┴───────────────────────┴──────────────────┴───────► Tỉ lệ sử dụng (U)
             0%                      80%                100%
```

---

## 🛠️ 2. Các Giải Pháp Kỹ Thuật Tối Ưu Đặc Thù Soroban

Blockchain Stellar Soroban sở hữu các đặc tính độc đáo về bộ nhớ lưu trữ và năng lượng CPU. UdonFi đã thiết kế những giải pháp đột phá để tối ưu hóa hiệu năng:

### A. Lưới Matrix u128 Bitmap Trạng Thái (Tối Ưu Phí Ledger)
Thay vì lưu trữ danh sách tài sản thế chấp và nợ của người dùng dưới dạng mảng (Vector) hoặc bản đồ (Map) tiêu tốn rất nhiều dung lượng bộ nhớ (Storage Fees) và gas để đọc ghi, UdonFi nén toàn bộ trạng thái tài khoản vào **một biến `u128` duy nhất**:
*   Mỗi tài sản trong giao thức chiếm **2 bit**:
    *   **Bit $2i$ (Collateral Flag):** Cờ thế chấp của tài sản thứ $i$ (ví dụ: XLM thế chấp là Bit 0).
    *   **Bit $2i + 1$ (Borrow Flag):** Cờ nợ của tài sản thứ $i$ (ví dụ: XLM nợ là Bit 1).
*   Thao tác kiểm tra hoặc cập nhật trạng thái được thực hiện thông qua các phép toán bitwise cực kỳ nhanh:
    *   *Bật thế chấp*: `bitmap |= (1 << 2i)`
    *   *Kiểm tra nợ*: `(bitmap >> (2i + 1)) & 1 == 1`
*   **Kết quả:** Giải pháp này giúp tiết kiệm **95% chi phí lưu trữ** trên Ledger Soroban.

---

### B. Quy Trình Thanh Lý 2 Bước (2-Step Liquidation - Vượt Giới Hạn CPU)
Soroban giới hạn năng lượng CPU tối đa cho mỗi giao dịch là **100 triệu Instructions**. Một giao dịch thanh lý đơn lẻ truyền thống (vừa đọc Oracle, cập nhật lãi suất tích lũy, tính Health Factor, chuyển nợ, tịch thu thế chấp) thường ngốn từ **100M - 120M CPU instructions** khiến giao dịch bị máy ảo revert lập tức.

UdonFi giải quyết vấn đề này bằng mô hình **Thanh lý 2 bước phi tập trung**:

```text
                       QUY TRÌNH THANH LÝ 2 BƯỚC AN TOÀN
                       
       ┌────────────────────────┐                   ┌────────────────────────┐
       │  prepare_liquidation() │ ── Session ID ──> │ execute_liquidation()  │
       │  (~60M CPU Instructions)│                   │ (~30M CPU Instructions)│
       └───────────┬────────────┘                   └───────────┬────────────┘
                   │                                            │
        - Đánh giá Health Factor                     - Người thanh lý nạp tiền trả nợ
        - Khóa tài sản thế chấp                      - Giải phóng tài sản thế chấp
        - Sinh Session ID lưu ledger                 - Chuyển thưởng 5% Bonus
```
Bằng cách chia nhỏ một quy trình cồng kềnh thành hai giao dịch độc lập được liên kết mã hóa, mỗi bước thực thi luôn nằm dưới ngưỡng 100M CPU instructions, đảm bảo việc thanh lý diễn ra trơn tru mà không bị chặn bởi cơ chế giới hạn của Soroban VM.

---

### C. Cơ Chế Tự Động Gia Hạn TTL (Chống Phình Sổ Cái)
Để chống phình sổ cái, Soroban quy định mọi dữ liệu lưu trữ đều có bộ đếm ngược thời gian sống (TTL) tính theo số block ledger. Dữ liệu của UdonFi tự động decay (giảm dần) theo thời gian.
*   Khi TTL chạm 0, dữ liệu số dư tài khoản sẽ bị **evict (trục xuất)** khỏi Ledger.
*   UdonFi tích hợp cơ chế tự động **gia hạn TTL (extend_ttl)** lên tối đa **6,000 ledgers** mỗi khi người dùng có hành động nạp/vay/trả nhằm duy trì trạng thái lưu trữ vĩnh viễn với chi phí tối ưu nhất.

---

## 📂 3. Cấu Trúc Mã Nguồn Dự Án

Thư mục dự án được tổ chức rõ ràng thành mô hình Monorepo:

```text
UdonFi/
├── contracts/                  # Mã nguồn Smart Contracts (Rust)
│   ├── lending_pool/           # Hợp đồng lõi quản lý tiền nạp, vay và APY
│   ├── liquidation/            # Hợp đồng quản lý thanh lý 2 bước (Prepare/Execute)
│   ├── reserve/                # Hợp đồng quản lý cấu hình các Reserve tài sản
│   ├── price_oracle/           # Trình giả lập nguồn giá Oracle XLM/USDC
│   ├── a_token/                # Token đại diện tài sản nạp (tích lũy lãi động)
│   ├── debt_token/             # Token đại diện khoản nợ (tích lũy lãi vay)
│   ├── common/                 # Cấu trúc dữ liệu và Macro chung
│   └── deploy.ps1              # Script tự động hóa triển khai lên Soroban Testnet
│
├── indexer_bot/                # Bot NodeJS lập chỉ mục sự kiện on-chain Soroban
│   ├── index.js                # Vòng lặp quét sự kiện, giải mã XDR và thiết lập WebSocket
│   ├── firebase.js             # Cấu hình kết nối đồng bộ cơ sở dữ liệu Firestore Cloud
│   └── package.json            # Các thư viện phụ thuộc của bot
│
└── frontend/                   # Ứng dụng giao diện Web3 cao cấp (React + TS + Vite)
    ├── src/
    │   ├── types/              # Định nghĩa Type-safety rõ ràng cho dữ liệu Web3
    │   ├── components/         # Các component giao diện tinh xảo
    │   │   ├── Header.tsx      # Thanh điều hướng, chỉ số TVL & Hộp thông báo non-blocking
    │   │   ├── SorobanBitmap.tsx # Trực quan hóa lưới Matrix trạng thái LED 128-bit
    │   │   ├── SorobanKinked.tsx # Biểu đồ APY SVG động hiển thị real-time
    │   │   ├── SimulatorPage.tsx # Bảng điều khiển mô phỏng chuỗi khối cục bộ trong bộ nhớ
    │   │   └── ConsoleLogger.tsx # Dòng log hiển thị trực tiếp giao dịch RPC Soroban
    │   ├── index.css           # Hệ thống CSS Design Tokens (Glassmorphism & Neon Glow)
    │   └── App.tsx             # Quản lý trạng thái trung tâm và tính toán tài chính
    └── vite.config.ts          # Cấu hình build & phát triển Vite
```

---

## 🚀 4. Hướng Dẫn Cài Đặt & Chạy Dự Án

Bạn có thể chạy thử nghiệm UdonFi theo hai chế độ: **Chạy Offline Sandbox nhanh** (không cần cài đặt môi trường ngoài) hoặc **Chạy tích hợp đầy đủ mạng lưới thật Testnet**.

### Cách A: Khởi Chạy Nhanh Trình Giả Lập Offline (Khuyên Dùng Cho Demo)
Giao diện Client đã tích hợp sẵn một **trình giả lập máy ảo blockchain** chạy độc lập ngay trên bộ nhớ trình duyệt, giúp trải nghiệm tất cả tính năng mà không cần cài đặt node:

1.  **Di chuyển vào thư mục frontend:**
    ```bash
    cd frontend
    ```
2.  **Cài đặt các gói phụ thuộc và chạy máy chủ phát triển:**
    ```bash
    npm install
    npm run dev
    ```
3.  Truy cập vào địa chỉ được cấp `http://localhost:5173` và click chọn tab **"Trình Giả Lập"** trên thanh Header để bắt đầu trải nghiệm!

---

### Cách B: Chạy Bot Indexer Realtime (Đồng Bộ Dữ Liệu Lên Mây)
Để cập nhật trực tiếp trạng thái từ mạng Stellar Testnet thật lên cơ sở dữ liệu dùng chung:

1.  **Thiết lập Key**: Đặt file cấu hình Firebase của bạn tại `indexer_bot/serviceAccountKey.json`.
2.  **Di chuyển vào thư mục bot**:
    ```bash
    cd indexer_bot
    ```
3.  **Khởi chạy bot quét sự kiện**:
    ```bash
    npm install
    npm start
    ```
    Bot sẽ mở một Socket.io server tại cổng `3001` để broadcast trực tiếp dữ liệu realtime cho Frontend bất cứ khi nào có giao dịch phát sinh trên chuỗi khối!

---

### Cách C: Biên Dịch & Triển Khai Smart Contracts (Rust)
Để tinh chỉnh hoặc deploy lại các hợp đồng thông minh Rust lên Stellar Testnet:

1.  **Compile toàn bộ hợp đồng Soroban sang WASM:**
    ```bash
    cd contracts
    cargo build --target wasm32v1-none --release
    ```
2.  **Chạy các unit test toán học và logic thanh lý:**
    ```bash
    cargo test
    ```
3.  **Deploy tự động hóa (Yêu cầu Soroban/Stellar CLI):**
    ```powershell
    ./deploy.ps1
    ```

---

## 🎨 5. Điểm Nhấn Trải Nghiệm Giao Diện Premium (UX/UI Showcases)

UdonFi mang đến một chuẩn mực mới trong thiết kế giao diện Web3 Lending tinh xảo và các giải pháp tối ưu hóa dữ liệu đỉnh cao cho Stellar Soroban:

*   **🍜 Tô Mì UdonFi Bốc Khói**: Biểu tượng tô mì Udon bốc khói neon đổi sắc gradient ở góc trái màn hình được vẽ thuần bằng CSS kết hợp animation keyframe cực kỳ độc đáo đại diện cho dòng chảy thanh khoản mượt mà.
*   **📊 Biểu Đồ Lãi Suất Gấp Khúc SVG**: Biểu đồ tự vẽ bằng SVG, chấm xanh lá thể hiện tỉ lệ Utilization $U$ sẽ chạy lướt dọc theo đường dốc gấp khúc cực kỳ trực quan khi bạn tương tác gửi/vay.
*   **🟩 Lưới 128-bit Bitmap**: Một ma trận LED hiển thị trạng thái bit-packing của Ledger. Nhấp chọn LED bất kỳ để đọc giải nghĩa logic bitwise và click để mô phỏng lật bit (toggle).
*   **🔔 Hệ Thống Thông Báo Bell Không Gây Cản Trở (Non-blocking)**: Thay vì tự động cuộn trang hoặc nhảy màn hình đột ngột khi hoàn tất các giao dịch nạp/vay, hệ thống chuông báo mới ở Header sẽ hiển thị các cập nhật dưới dạng toast thông báo nền kèm log kiểm tra lỗi chi tiết.
*   **🕹️ Trình Giả Lập Dòng Chảy Thời Gian**: Trực quan hóa việc "Tua nhanh thời gian" (Time Travel) để xem lãi suất kép tích lũy theo block thực tế và chủ động ép thanh lý nợ xấu tức thì.

---

*Được thiết kế tỉ mỉ. Được xây dựng cho tương lai của Web3. Chào mừng bạn đến với UdonFi.*
