# AGENTS.md

## 0. Mục tiêu

Áp dụng cho mọi task trong repository.

Ưu tiên theo thứ tự:

1. Làm đúng yêu cầu mới nhất.
2. Không phá dữ liệu, bảo mật hoặc hành vi đang hoạt động.
3. Kiểm tra lỗi, sửa đúng nguyên nhân, chạy lại test.
4. Chỉ thay đổi phần cần thiết.
5. Tiết kiệm token, lệnh và thời gian nhưng không bỏ kiểm tra bắt buộc.

Không kể chain-of-thought. Không báo cáo tiến độ dài. Chỉ nhắn khi hoàn tất phase lớn,
gặp blocker cần user quyết định, hoặc kết thúc task.

---

## 1. Hằng số dự án

### Source of truth

- `frontend/`: React + TypeScript + Vite + Tailwind, React Router, Axios,
  Recharts, SheetJS/xlsx, barcode, Playwright.
- `backend/`: PHP 8.3+ + Laravel 13 REST API, Eloquent, Sanctum, middleware,
  policy, migrations.
- `docs/clone/`: manifests khám phá và coverage.
- `artifacts/`: screenshot, trace, log và report khi cần.

Không tạo source song song như `client/`, `deploy-upload/` hoặc project cha mới.

### Database và auth

- MySQL 8.x cho local/production.
- Automated tests dùng SQLite in-memory hoặc database riêng có hậu tố `_test`.
- Sanctum SPA cookie-based authentication.
- Không lưu bearer token trong `localStorage`.

### Website tham chiếu

- `https://www.newtimeshair.com/`
- Mặc định chỉ khảo sát URL public, canonical, cùng origin `www.newtimeshair.com`.
- Chỉ tái tạo giao diện và hành vi quan sát công khai.
- Không vượt login/paywall/anti-bot; không gửi form thật, tạo tài khoản, đơn hàng,
  thanh toán hoặc side effect trên website tham chiếu.
- Không lấy backend, secret, private API hoặc dữ liệu người dùng.
- Chỉ dùng thương hiệu/nội dung/asset khi user có quyền; nếu chưa rõ, dùng
  placeholder hoặc asset user cung cấp.

---

## 2. Chế độ

### EXECUTE — mặc định

Tự khảo sát có trọng tâm → sửa → test → sửa lỗi → test lại → báo cáo.

### BOOTSTRAP

Tự áp dụng khi user yêu cầu khởi tạo/cài đặt. Sau khi xác minh môi trường local,
được phép:

- cài dependency trực tiếp cần cho stack;
- tạo database MySQL local mới;
- tạo/chạy migration và seeder local;
- tạo `.env` local và file example;
- chạy các bước kết nối frontend ↔ backend.

Không xóa hoặc ghi đè database có sẵn.

### AUDIT READ-ONLY

Chỉ khi user ghi rõ `AUDIT READ-ONLY`. Không sửa file, cài package, migrate,
seed hoặc chạy test có side effect.

---

## 3. Tiết kiệm token bắt buộc

1. Dùng `rg`, đọc đoạn file và `git diff -- <path>`; không đọc toàn repo nếu task
   cục bộ.
2. Không in lockfile, `node_modules`, `vendor`, build output hoặc log dài.
3. Khảo sát tăng dần từ route/component/controller được nhắc tới; chỉ mở rộng khi
   có bằng chứng liên quan.
4. Dùng lại `docs/clone/`; không crawl lại toàn site cho task cục bộ nếu manifest
   còn hợp lệ.
5. Batch file reads và lệnh độc lập.
6. Không chạy lại cùng lệnh nếu chưa sửa code/config/môi trường.
7. Chạy targeted test trước; suite rộng chỉ ở quality gate hoặc thay đổi shared.
8. Không tạo abstraction, tài liệu, test hoặc dependency ngoài acceptance criteria.
9. Khi pass chỉ báo PASS; khi fail chỉ trích lỗi quyết định. Lưu output dài vào
   `artifacts/`.
10. Báo cáo cuối khoảng 20 dòng; không lặp lại yêu cầu hoặc toàn bộ quá trình.

---

## 4. Quy trình thực thi

### 4.1 Xác định task

Tự xác định nội bộ:

- acceptance criteria;
- phạm vi FE/BE/DB;
- rủi ro;
- test cần chạy.

Không hỏi khi yêu cầu đủ rõ. Chỉ hỏi nếu thiếu credential bắt buộc, quyết định
nghiệp vụ ảnh hưởng dữ liệu/quyền, quyền asset, production action hoặc thao tác
phá hủy.

### 4.2 Baseline

Nếu có Git:

```bash
git status --short
git diff --check
```

Nếu worktree có thay đổi từ trước:

- không revert/xóa/format hàng loạt/ghi đè;
- đọc diff file cần chạm;
- phân biệt thay đổi cũ và của task trong báo cáo.

Đọc script thực tế trong `package.json`, `composer.json` và Playwright config.
Không đoán hoặc chạy script không tồn tại.

### 4.3 Khảo sát tối thiểu đủ dùng

Frontend: route → page/layout/component → state/hook/API/type → CSS/breakpoint →
test liên quan.

Backend: route → controller → request/service → model/migration → middleware/
policy → frontend call site → test.

Với bug UI phải xác định DOM/component thật, selector/class thắng, breakpoint và
state liên quan. Không sửa CSS theo phỏng đoán.

### 4.4 Sửa

- Patch nhỏ nhất đạt acceptance criteria.
- Không refactor, đổi API/schema/nghiệp vụ ngoài yêu cầu.
- Không rewrite file lớn nếu có thể sửa cục bộ.
- Không hardcode credential hoặc dữ liệu nghiệp vụ.
- Đọc lại diff sau mỗi lát cắt có ý nghĩa.

### 4.5 Vòng sửa lỗi

1. Chạy kiểm tra nhỏ nhất liên quan.
2. Nếu fail: đọc lỗi → tìm nguyên nhân gốc → sửa → review diff → chạy lại test fail.
3. Khi targeted test pass, chạy regression cần thiết.
4. Không lặp cùng lệnh nếu không có thay đổi.
5. Nếu cùng lỗi còn sau ba vòng sửa có ý nghĩa, dừng thử ngẫu nhiên và báo
   `BLOCKED` hoặc `COMPLETE_WITH_KNOWN_ISSUE` kèm bằng chứng ngắn.

---

## 5. Clone Newtimes Hair

### 5.1 Discovery một lần, dùng lại nhiều lần

Trước khi dựng hàng loạt trang, tạo/cập nhật:

```text
docs/clone/routes.json
docs/clone/templates.json
docs/clone/components.json
docs/clone/interactions.json
docs/clone/assets.json
docs/clone/coverage.json
```

Khám phá theo thứ tự:

1. sitemap/robots public;
2. desktop/mobile navigation, mega menu, dropdown, footer;
3. internal links, category/product pagination;
4. blog, search, policy, catalog và form pages;
5. canonical link của từng trang.

Chống crawl vô hạn:

- chỉ cùng origin;
- bỏ fragment/tracking params, chuẩn hóa trailing slash;
- deduplicate canonical URL;
- coi filter/sort/query là state, trừ khi có canonical riêng;
- không theo archive/search vô hạn;
- không crawl action account/checkout/logout hoặc endpoint gây side effect.

Manifest và screenshot phải có timestamp. Không crawl lại route/component không đổi.

### 5.2 Coverage không bỏ sót

Mọi public canonical URL phải có trong `routes.json`.

Nhóm theo template: homepage, listing, product detail, landing/content, blog list,
blog detail, catalog/form, policy/support, auth shell, search/empty/error.

- Mọi route: smoke coverage.
- Mọi template: visual desktop + mobile.
- Route có layout/interaction riêng: test riêng.
- Shared component: test một lần đủ state và kiểm tra ở các template đại diện.

### 5.3 State phải quan sát khi tồn tại

Default, hover, keyboard focus, active, open/expanded, selected, disabled, loading,
empty, error, sticky/scrolled và mobile open/collapsed.

Ưu tiên: announcement bar, header, search, language/currency, login/cart, mega
menu, product card, filter/sort/pagination, gallery, forms, tabs/accordion,
carousel, modal/drawer và footer.

Không suy animation chỉ từ ảnh tĩnh. Dùng Playwright hover/click/focus và chờ UI
ổn định trước khi chụp.

### 5.4 Viewport

Route/template bị thay đổi:

- Desktop `1440x900`
- Mobile `390x844`
- Tablet `768x1024` chỉ khi có breakpoint riêng

Không chụp lại mọi viewport khi thay đổi không ảnh hưởng responsive.

### 5.5 Fidelity

Ưu tiên: cấu trúc/hành vi → responsive → typography/spacing/color →
hover/focus/animation → pixel polish.

Dùng design tokens, không hardcode lặp. Không bỏ semantic, focus-visible,
keyboard navigation hoặc accessibility để giống hình.

---

## 6. Kiểm tra bắt buộc

### 6.1 Frontend

Khi frontend thay đổi, dùng script thực tế; tối thiểu:

```bash
cd frontend
npm run lint
npm run build
```

Chạy typecheck riêng nếu repository có script.

### 6.2 Backend

Chạy test Laravel targeted trước, suite rộng khi thay đổi shared/auth/database:

```bash
cd backend
php artisan test --filter=<RelevantTest>
php artisan test
```

Chỉ dùng lệnh tồn tại và đúng config. Không test ghi vào DB development/production.

### 6.3 Playwright Chromium

Mọi thay đổi ảnh hưởng UI, routing, form, auth hoặc integration phải được kiểm tra
bằng Playwright Chromium:

1. chạy spec/grep targeted;
2. fail thì sửa và chạy lại targeted;
3. pass thì chạy regression Chromium phù hợp;
4. full Chromium suite chỉ ở milestone quality gate hoặc thay đổi shared/global.

Ví dụ:

```bash
cd frontend
npx playwright test <spec> --project=chromium
```

Không dùng `--update-snapshots` để che lỗi. Chỉ cập nhật baseline khi thay đổi UI
là chủ đích và đã đối chiếu reference.

Visual test phải dùng dữ liệu ổn định, chờ font/ảnh, chỉ mask phần thật sự động và
không nới threshold chỉ để pass. Lưu screenshot/trace/video lỗi trong output test
hoặc `artifacts/`.

### 6.4 Quality gate clone milestone

- smoke toàn bộ route canonical đã implement;
- Chromium E2E cho flow chính;
- visual desktop + mobile cho mọi template;
- interaction check shared header/menu/card/form;
- cập nhật `docs/clone/coverage.json`.

Không ghi coverage 100% nếu còn route/state chưa kiểm tra.

---

## 7. An toàn DB, auth và dependency

### Local DB

Chỉ tạo DB/migrate/seed khi task là BOOTSTRAP hoặc user yêu cầu rõ, `APP_ENV=local`,
host đã xác minh local và tên DB đúng dự án.

Không tự chạy:

```text
DROP DATABASE
migrate:fresh
db:wipe
TRUNCATE diện rộng
restore đè
SQL update/delete không có điều kiện
```

Production: không migrate/seed/deploy/import/restore/write nếu chưa được user yêu
cầu rõ và xác nhận rủi ro.

Auth: không tắt auth/CSRF/CORS để test; không debug endpoint/permission bypass.
Auth/role/policy cần test success, unauthenticated và unauthorized.

### Dependency

Được thêm package khi trực tiếp cần, chưa có giải pháp tương đương, maintained,
tương thích và chỉ cài tối thiểu. Báo tên + lý do.

Phải hỏi trước khi nâng major framework, thay thư viện lõi/auth strategy, thêm
dịch vụ trả phí hoặc package có license/rủi ro không rõ. Không update toàn bộ
dependency để sửa lỗi cục bộ.

---

## 8. Git và hard gates

Không tự chạy nếu user chưa yêu cầu:

```bash
git reset --hard
git clean -fd
git checkout .
git restore .
git commit
git push
```

Không sửa `.env` production, secret, file ngoài repo, `vendor` hoặc generated
file ngoài build task.

Dừng và báo `BLOCKED` trước khi:

- xóa/ghi đè dữ liệu hoặc database;
- thao tác production/deploy;
- đổi auth/role/nghiệp vụ/schema ngoài yêu cầu;
- thiếu credential/API key bắt buộc;
- cần vượt login/paywall/anti-bot;
- quyền asset chưa rõ và task phụ thuộc asset;
- baseline fail nhưng không phân biệt được lỗi cũ/mới;
- không thể chạy kiểm tra quan trọng;
- phạm vi thực tế lớn bất thường và có nguy cơ sai nghiệp vụ.

Khi BLOCKED chỉ báo: blocker, bằng chứng, rủi ro và đúng một thông tin/quyết định
cần user cung cấp.

---

## 9. COMPLETE và báo cáo

Chỉ ghi `COMPLETE` khi:

- acceptance criteria đạt;
- đúng phạm vi;
- targeted test pass;
- Playwright Chromium pass cho hành vi bị ảnh hưởng;
- regression, lint/build/backend test liên quan pass;
- `git diff --check` pass;
- không còn lỗi biết trước do task tạo;
- `coverage.json` đã cập nhật nếu thuộc clone milestone.

Verdict hợp lệ:

- `COMPLETE`
- `COMPLETE_WITH_KNOWN_ISSUE`
- `BLOCKED`

Trước khi kết thúc:

```bash
git diff --check
git status --short
```

Báo cáo tiếng Việt, không chain-of-thought/raw log:

```text
KẾT QUẢ: COMPLETE | COMPLETE_WITH_KNOWN_ISSUE | BLOCKED

Đã làm
- <1–4 ý>

Kiểm tra
- <command/nhóm test> — PASS/FAIL
- Playwright Chromium: <spec/flow> — PASS/FAIL

File/phạm vi
- <file hoặc thư mục chính>

Rủi ro còn lại
- Không / <rủi ro thực tế>

Blocker hoặc bước tiếp theo
- Không / <một hành động cụ thể>
```

Nếu nhiều file, tóm tắt theo thư mục. Nếu pass hết, không diễn giải lại toàn bộ
quá trình.
