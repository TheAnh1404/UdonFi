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

## 🧪 6. Quy Trình Thử Nghiệm Đầy Đủ Các Chức Năng DeFi (Supply → Withdraw → Borrow → Repay)

Phần này mô tả chi tiết từng bước để thử nghiệm toàn bộ vòng đời giao dịch DeFi trên UdonFi, bao gồm cơ chế **Tự Động Reset (Auto-Reset)** và quy trình **Redeploy & Reset Protocol** hoàn toàn.

---

### 📋 6.1 Điều Kiện Tiên Quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo bạn đã hoàn tất các bước sau:

| # | Yêu cầu | Cách thực hiện |
|---|---------|----------------|
| 1 | **Ví Freighter** đã cài đặt (Chrome Extension) | Cài tại [freighter.app](https://www.freighter.app/) → Đặt mạng **Testnet** |
| 2 | **Tài khoản đã được kích hoạt** trên Stellar Testnet | Dùng [Friendbot](https://friendbot.stellar.org/?addr=YOUR_ADDRESS) hoặc chạy script: `node indexer_bot/fund_user.js` |
| 3 | **Trustline USDC** đã được đăng ký | Trên giao diện UdonFi → Tab "Thị Trường Tín Dụng" → Nhấn nút **"Đăng Ký Trustline USDC"** |
| 4 | **Frontend** đang chạy | `cd frontend && npm install && npm run dev` → Truy cập `http://localhost:5173` |
| 5 | **Indexer Bot** đang chạy (tùy chọn) | `cd indexer_bot && npm install && npm start` → Lắng nghe tại `http://localhost:3001` |
| 6 | **Smart Contracts** đã triển khai trên Testnet | Xem mục 6.5 bên dưới nếu cần redeploy lại |

---

### 💰 6.2 Nạp Tiền Vào Ví Cá Nhân (Fund Wallet)

**Bước 1: Nạp XLM miễn phí từ Friendbot**

Mở terminal và chạy:
```bash
cd indexer_bot
node fund_user.js
```
Hoặc truy cập trực tiếp URL Friendbot với địa chỉ ví của bạn:
```
https://friendbot.stellar.org/?addr=YOUR_FREIGHTER_ADDRESS
```
> ⚠️ **Lưu ý:** Mỗi lần Friendbot nạp ~10,000 XLM vào ví Testnet. Bạn có thể gọi lại nếu cần thêm.

**Bước 2: Nhận USDC Custom Token (để Supply/Borrow USDC)**

USDC trên UdonFi sử dụng token tùy chỉnh với contract address:
```
CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ
```
Liên hệ Admin hoặc sử dụng script `initialize_reserves.js` để mint USDC vào ví mục tiêu.

---

### 🔄 6.3 Quy Trình Thử Nghiệm Tuần Tự Các Chức Năng

> **Thứ tự đề xuất:** `SUPPLY (Nạp)` → `WITHDRAW (Rút)` → `BORROW (Vay)` → `REPAY (Trả Nợ)`

#### 🟢 Bước 1: NẠP TIỀN (SUPPLY)

1. Vào tab **"Thị Trường Tín Dụng"** trên Dashboard
2. Kết nối ví Freighter (nút "Kết Nối Ví Freighter")
3. Chọn tab **"Nạp"** trên bảng tương tác phải
4. Chọn tài sản: **XLM** hoặc **USDC**
5. Nhập số lượng (ví dụ: `100 XLM`)
6. Nhấn **"NẠP TIỀN VÀO BỂ THANH KHOẢN"**
7. **Ký duyệt** trên popup Freighter

**Kết quả mong đợi:**
- ✅ Log hiển thị: `Chúc mừng! Giao dịch SUPPLY đã được xác nhận thành công`
- ✅ Tx Hash được hiển thị và lưu vào lịch sử giao dịch
- ✅ Số dư "Tổng Thế Chấp Nạp" tăng tương ứng
- ✅ Bitmap LED Bit 0 (XLM Collateral) sáng xanh

#### 🔵 Bước 2: RÚT TIỀN (WITHDRAW)

> **Điều kiện:** Phải đã SUPPLY thành công trước đó

1. Chọn tab **"Rút"** trên bảng tương tác
2. Chọn cùng tài sản đã nạp (ví dụ: **XLM**)
3. Nhập số lượng muốn rút (không vượt quá số đã nạp)
4. Nhấn **"RÚT TIỀN VỀ VÍ"**
5. **Ký duyệt** trên popup Freighter

**Kết quả mong đợi:**
- ✅ Log hiển thị: `Chúc mừng! Giao dịch WITHDRAW đã được xác nhận thành công`
- ✅ Số dư ví tăng lại, số dư "Tổng Thế Chấp Nạp" giảm
- ✅ Nếu rút hết → Bitmap LED tự tắt cờ Collateral

> **⚠️ Lưu ý quan trọng:** Nếu bạn đang có khoản vay (Borrow), hệ thống sẽ kiểm tra Health Factor sau khi rút. Nếu HF < 1.0, giao dịch bị REVERT tự động trên Soroban VM.

#### 🟣 Bước 3: VAY TIỀN (BORROW)

> **Điều kiện:** Phải đã SUPPLY tài sản thế chấp VÀ bật cờ Collateral trước

1. Chọn tab **"Vay"** trên bảng tương tác
2. Chọn tài sản muốn vay (ví dụ: **USDC**)
3. Nhập số lượng vay (phải ≤ 70% giá trị thế chấp — LTV tối đa)
4. Kiểm tra **Health Factor mô phỏng** trên bảng trước khi submit
5. Nhấn **"VAY TỪ BỂ THANH KHOẢN"**
6. **Ký duyệt** trên popup Freighter

**Kết quả mong đợi:**
- ✅ Log hiển thị: `Chúc mừng! Giao dịch BORROW đã được xác nhận thành công`
- ✅ Số dư ví USDC tăng, "Tổng Dư Nợ Vay" hiển thị số nợ
- ✅ Health Factor Gauge cập nhật từ ∞ xuống giá trị cụ thể
- ✅ Bitmap LED Bit 3 (USDC Borrow) sáng tím

#### 🔴 Bước 4: TRẢ NỢ (REPAY)

> **Điều kiện:** Phải đang có khoản vay

1. Chọn tab **"Trả"** trên bảng tương tác
2. Chọn tài sản đang nợ (ví dụ: **USDC**)
3. Nhập số lượng trả (có thể dùng nút **MAX** để trả hết)
4. Nhấn **"TRẢ NỢ CHO BỂ THANH KHOẢN"**
5. **Ký duyệt** trên popup Freighter

**Kết quả mong đợi:**
- ✅ Log hiển thị: `Chúc mừng! Giao dịch REPAY đã được xác nhận thành công`
- ✅ "Tổng Dư Nợ Vay" giảm tương ứng
- ✅ Health Factor tăng lên (an toàn hơn)
- ✅ Nếu trả hết → Bitmap LED tắt cờ Borrow, HF trở lại ∞

---

### ⚡ 6.4 Cơ Chế Tự Động Reset (Auto-Reset Protocol)

UdonFi tích hợp tính năng **tự động reset protocol** sau mỗi giao dịch thành công, giúp bạn thử nghiệm liên tục nhiều kịch bản mà không cần reset thủ công.

**Cách hoạt động:**
1. Sau khi bất kỳ giao dịch nào (SUPPLY/WITHDRAW/BORROW/REPAY/LEVERAGE) thành công
2. Hệ thống đợi **6 giây** rồi tự động kích hoạt Redeploy & Reset
3. Protocol mới được triển khai với contract ID mới, trạng thái sạch
4. Giao dịch trước đó vẫn được lưu trong **lịch sử Firestore**

**Bật/Tắt Auto-Reset:**
- Trên thanh Header có công tắc **"Auto Reset"** (Toggle Switch)
- **BẬT (ON):** Mỗi giao dịch thành công → tự động reset sau 6s
- **TẮT (OFF):** Giữ nguyên vị thế sau giao dịch để tiếp tục thử nghiệm thêm

> 💡 **Kịch bản thử nghiệm đề xuất:**
> 
> | Kịch bản | Auto-Reset |
> |----------|------------|
> | Thử từng chức năng riêng lẻ (SUPPLY → Reset → BORROW → Reset...) | **BẬT** |
> | Thử chuỗi liên tiếp (SUPPLY → BORROW → REPAY → WITHDRAW) | **TẮT** |
> | Demo cho người xem | **BẬT** (mỗi lần mới, trạng thái sạch) |

---

### 🔧 6.5 Triển Khai Lại Toàn Bộ Protocol (Full Redeploy & Reset)

Khi cần reset hoàn toàn hệ thống (ví dụ: lỗi trạng thái, contract hết hạn TTL, hoặc bắt đầu lại từ đầu):

**Bước 1: Biên dịch Smart Contracts**
```bash
cd contracts
cargo build --target wasm32v1-none --release
```

**Bước 2: Chạy script Redeploy**
```bash
node redeploy_entire_protocol.js
```

Script sẽ tự động:
1. Deploy 7 hợp đồng mới (Oracle, Pool, Liquidation, 2 aToken, 2 debtToken)
2. Initialize tất cả hợp đồng với cấu hình đúng
3. Add Reserve XLM + USDC vào Lending Pool
4. Thiết lập giá Oracle (XLM = $0.15, USDC = $1.00)
5. In ra tất cả **Contract IDs mới**

**Bước 3: Cập nhật Contract ID trong Frontend**

Sau khi redeploy, lấy **Lending Pool ID** mới từ output và cập nhật vào file `frontend/src/App.tsx`:
```typescript
const POOL_CONTRACT_ID = 'NEW_POOL_CONTRACT_ID_HERE';  // Dòng 30
```

**Bước 4: Cập nhật Contract ID trong Indexer Bot**

Cập nhật contract ID tương ứng trong `indexer_bot/index.js` nếu indexer cần theo dõi contract mới.

**Bước 5: Khởi động lại Frontend & Indexer**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Indexer Bot (tùy chọn)
cd indexer_bot && npm start
```

---

### 🔑 6.6 Bảng Tổng Hợp Các Contract ID Hiện Tại

| Hợp đồng | Vai trò | Contract ID |
|-----------|---------|-------------|
| **Lending Pool Router** | Hợp đồng lõi xử lý Supply/Withdraw/Borrow/Repay | `CBP6X4XEFDSPJV7DCEQ7M4OEA2PZMXMHWMC3SE26FHOVC2AQQLZMWJY6` |
| **XLM SAC (Native)** | Stellar Asset Contract cho XLM | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **USDC Custom Token** | Token USDC tùy chỉnh cho UdonFi Testnet | `CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ` |

> ⚠️ **Lưu ý:** Các Contract ID sẽ thay đổi sau mỗi lần chạy `redeploy_entire_protocol.js`. Cần cập nhật vào Frontend sau mỗi lần redeploy.

---

### ❓ 6.7 Xử Lý Sự Cố Thường Gặp (Troubleshooting FAQ)

| Sự cố | Nguyên nhân | Giải pháp |
|-------|------------|-----------|
| `Tài khoản chưa được kích hoạt` | Ví chưa có XLM trên Testnet | Chạy `node indexer_bot/fund_user.js` hoặc dùng Friendbot |
| `Mô phỏng giao dịch thất bại` | Contract chưa khởi tạo / TTL hết hạn | Chạy `node contracts/redeploy_entire_protocol.js` |
| `Health factor below threshold` | Rút/Vay quá nhiều so với thế chấp | Giảm số lượng hoặc nạp thêm thế chấp trước |
| `failed host function` (USDC) | Chưa đăng ký Trustline USDC | Nhấn nút "Đăng Ký Trustline USDC" trên giao diện |
| Ví không mở popup ký | Freighter chưa cấp quyền cho site | Mở Freighter → Settings → Security → Allow `localhost` |
| `unexpected end of file` khi deploy | Testnet RPC quá tải / timeout | Script đã có retry tự động 3 lần với 0.1 XLM inclusion fee |
| Auto-Reset không hoạt động | Công tắc Auto Reset đang TẮT | Bật công tắc "Auto Reset" trên Header |

---

*Được thiết kế tỉ mỉ. Được xây dựng cho tương lai của Web3. Chào mừng bạn đến với UdonFi.*
