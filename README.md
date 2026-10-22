# pdpa-poc-api

POC การเข้ารหัสข้อมูลส่วนบุคคลของผู้ใช้ใน MongoDB ให้สอดคล้องกับ **พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)**

- **Stack:** Bun + Express 5 + Mongoose + express-validator + zod (โครงสร้างโฟลเดอร์ตาม citizen-portal-api)
- **คู่กับ:** `pdpa-poc-web` (Vite + React + TypeScript + MUI) — หน้าเดียวสำหรับ login และ CRUD ผู้ใช้

> PDPA ไม่ได้บังคับว่าต้อง encrypt แต่บังคับให้มี "มาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม" (มาตรา 37(1))
> การ encrypt เป็นหนึ่งในมาตรการนั้น และข้อมูลที่ encrypt แล้วยังนับเป็นข้อมูลส่วนบุคคลอยู่ (เป็น pseudonymization ไม่ใช่ anonymization)
> เอกสารนี้อธิบายหลักการด้านเทคนิค ไม่ใช่คำปรึกษาทางกฎหมาย

---

## สารบัญ

1. [เริ่มต้นใช้งาน](#1-เริ่มต้นใช้งาน)
2. [ภาพรวมสถาปัตยกรรม](#2-ภาพรวมสถาปัตยกรรม)
3. [Key ทั้งหมด — สำคัญอย่างไร ทำไมต้องมี](#3-key-ทั้งหมด--สำคัญอย่างไร-ทำไมต้องมี)
4. [โครงสร้างข้อมูลใน MongoDB](#4-โครงสร้างข้อมูลใน-mongodb)
5. [Login และ Role](#5-login-และ-role)
6. [Flow CRUD ของ user](#6-flow-crud-ของ-user)
7. [Flow การค้นหา (Search)](#7-flow-การค้นหา-search)
8. [Flow งานดูแลระบบ (rotate key, retention, rebuild index)](#8-flow-งานดูแลระบบ)
9. [API](#9-api)
10. [โครงสร้างโฟลเดอร์](#10-โครงสร้างโฟลเดอร์)
11. [ความปลอดภัยและข้อควรระวัง](#11-ความปลอดภัยและข้อควรระวัง)
12. [ก่อนขึ้น production](#12-ก่อนขึ้น-production)

---

## 1. เริ่มต้นใช้งาน

```bash
docker compose up -d            # MongoDB ที่ localhost:27017
bun install
cp .env.example .env
bun run gen-keys                # สุ่ม key ทั้งหมด → คัดลอกผลลัพธ์ไปใส่ใน .env
bun run seed-staff              # สร้างบัญชี support01 / admin01 / dpo01
bun run dev                     # API ที่ http://localhost:3041
```

รหัสผ่านของบัญชีที่ seed คือค่า `SEED_STAFF_PASSWORD` ใน `.env`

> ⚠️ **`.env` ห้าม commit** (อยู่ใน `.gitignore` แล้ว) และ **ห้ามทำ key หาย** — ถ้า `KEK_*` หาย ข้อมูลทั้งหมดจะถอดรหัสไม่ได้อีกเลย

API และทุก script จะพิมพ์ host/db ที่ต่อออกมาตอนเริ่ม — ตรวจทุกครั้งว่าต่อ DB ที่ถูกต้อง
ทดสอบโดยไม่แตะ DB หลักได้ด้วยการ override:

```bash
DATABASE_URL=mongodb://127.0.0.1:27018/pdpa_poc_test bun --env-file=.env run src/index.ts
```

### ตัวแปรใน `.env`

| ตัวแปร | ความหมาย |
|---|---|
| `DATABASE_URL` | MongoDB connection string |
| `KEK_V1`, `KEK_V2`, ... | Key Encryption Key แต่ละเวอร์ชัน (base64, 32 bytes) |
| `KEK_CURRENT` | เวอร์ชัน KEK ที่ใช้ wrap DEK ใหม่ |
| `BLIND_INDEX_KEY` | key สำหรับ HMAC ทำ blind index (base64, 32 bytes) |
| `JWT_SECRET` | key เซ็น JWT ของการ login (อย่างน้อย 32 ตัวอักษร) |
| `JWT_EXPIRES_IN_HOURS` | อายุ login (ชั่วโมง, ค่าเริ่มต้น 8) |
| `SEED_STAFF_PASSWORD` | รหัสผ่านของบัญชีที่สร้างด้วย `seed-staff` |
| `COOKIE_SECURE` | `true` เมื่อ deploy บน HTTPS เท่านั้น |
| `ALLOW_ORIGIN` | origin ของหน้าเว็บที่อนุญาต (CORS) |
| `RETENTION_DAYS` | เก็บข้อมูลกี่วันก่อนลบอัตโนมัติ (ค่าเริ่มต้น 1825 = 5 ปี) |

---

## 2. ภาพรวมสถาปัตยกรรม

```
                     ┌──────────────── pdpa-poc-api ─────────────────┐
 Browser ──cookie──► │ authentication → validation → controller      │
 (pdpa-poc-web)      │        → service → repository                 │
                     │                                               │
                     │  utility/crypto  (AES-256-GCM, HMAC)          │
                     │  externals/kms   (wrap/unwrap DEK ด้วย KEK)   │
                     └───────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┼──────────────────────┐
           ▼                         ▼                      ▼
   users                       data_keys               audit_logs, staffs
   pii: ciphertext ราย field   wrappedDek ต่อ user     ใครทำอะไรกับข้อมูลของใคร
   searchIdx: HMAC
```

**หลักการ 3 ชั้น**

```
KEK (กุญแจหลัก — POC อยู่ใน .env / production อยู่ใน KMS)
 └─ wrap ─► DEK ต่อ user 1 ดอก          → เก็บแบบล็อกแล้วใน data_keys.wrappedDek
             └─ AES-256-GCM ─► ข้อมูลแต่ละ field → users.pii

BLIND_INDEX_KEY ─ HMAC-SHA256 ─► users.searchIdx   (ใช้ค้นหาโดยไม่ต้อง decrypt)
```

---

## 3. Key ทั้งหมด — สำคัญอย่างไร ทำไมต้องมี

### เปรียบเทียบง่ายๆ: ตู้เซฟในธนาคาร

| ในตัวอย่าง | ในระบบ |
|---|---|
| ของในตู้เซฟของสมชาย | ข้อมูลส่วนบุคคลของสมชาย (`users.pii`) |
| **กุญแจตู้เซฟ** — ตู้ละดอก ไม่ซ้ำกัน | **DEK** — user ละ 1 ดอก |
| ตู้เก็บกุญแจ | collection `data_keys` |
| **กุญแจหลักของตู้เก็บกุญแจ** ที่ รปภ. ถือ | **KEK** — อยู่ใน KMS (POC: `.env`) |
| บัตรคิวที่ใช้ตามหาตู้โดยไม่ต้องเปิดตู้ | **Blind index** (`users.searchIdx`) ทำด้วย `BLIND_INDEX_KEY` |

### DEK (Data Encryption Key)

- **คืออะไร:** key สุ่ม 256-bit **แยกต่อ user** ใช้ encrypt ข้อมูลของ user คนนั้นด้วย AES-256-GCM
- **เก็บที่ไหน:** **ไม่เก็บตัวจริงที่ไหนเลย** — เก็บเฉพาะแบบที่ถูกล็อกด้วย KEK แล้ว (`data_keys.wrappedDek`) ตัวจริงอยู่ใน memory ระหว่าง request เท่านั้น
- **ทำไมต้องแยกต่อ user**
  - **ลบรายคนได้จริง (มาตรา 33):** ทำลาย DEK ของคนนั้น → ciphertext ของเขา **ทุกที่ รวมถึงใน backup** ถอดรหัสไม่ได้อีก (crypto-shredding) โดยไม่กระทบคนอื่น
  - **จำกัดความเสียหาย:** DEK หลุด 1 ดอก = เสียแค่ 1 คน
  - **ไม่ชนขีดจำกัดของ AES-GCM:** key เดียวไม่ควร encrypt เกิน ~2³² ครั้ง (IV แบบสุ่ม) — แยกต่อ user จึงไม่มีทางถึง

> `wrappedDek` ≠ DEK — `wrappedDek` คือ DEK ที่ถูกล็อกด้วย KEK แล้ว ขโมยไปก็ใช้ไม่ได้ถ้าไม่มี KEK

### KEK (Key Encryption Key)

- **คืออะไร:** key หลักที่ใช้ "ล็อก" (wrap) DEK — **KEK ไม่เคย encrypt ข้อมูล user โดยตรง**
- **เก็บที่ไหน:** POC อ่านจาก `KEK_V1` ใน `.env` / production ต้องอยู่ใน **KMS หรือ Vault** และไม่ออกมาอยู่ใน server เลย
- **ทำไมต้องมี (ทำไมไม่ใช้ KEK encrypt ข้อมูลตรงๆ)**

| | ใช้ KEK encrypt ข้อมูลตรงๆ | DEK + KEK (envelope encryption) |
|---|---|---|
| key หลุด | ข้อมูลทุกคนหลุด | DEK หลุด = เสียคนเดียว |
| ลบรายคน (ม.33) | ทำไม่ได้ (ลบ key = พังทุกคน) | ทำลาย DEK ของคนนั้น |
| เปลี่ยน key | decrypt + encrypt ข้อมูล **ทุก field ทุกคน** ใหม่ | re-wrap แค่ DEK (32 bytes ต่อคน) ข้อมูลไม่ต้องแตะ |
| ใช้กับ KMS | ต้องส่งทุก field ไป KMS (ช้า, จำกัดขนาด) หรือดึง KEK ออกมา (เสียประโยชน์) | KMS ทำแค่ wrap/unwrap DEK |

- **ทำไมมีเลขเวอร์ชัน (`kekVersion`)** — ระหว่างเปลี่ยน KEK ระบบจะมี DEK ที่ล็อกด้วย v1 และ v2 ปนกันเสมอ (re-wrap ทีละคน, user ใหม่ใช้ v2 ทันที, restore backup เก่า) เวอร์ชันบอกว่าต้องใช้ KEK ตัวไหนปลดล็อก และใช้ตรวจว่าลบ KEK เก่าได้หรือยัง

### BLIND_INDEX_KEY

- **ปัญหา:** encrypt แต่ละครั้งใช้ IV สุ่ม → ค่าเดียวกันได้ ciphertext ต่างกันทุกครั้ง → `find({ email })` ไม่ได้, ทำ unique index ไม่ได้
- **ทางแก้:** เก็บ "ลายนิ้วมือ" `HMAC-SHA256(BLIND_INDEX_KEY, "<label>:<ค่าที่ normalize แล้ว>")` ไว้ใน `searchIdx` — ค่าเดิมได้ผลเดิมเสมอ แต่ย้อนกลับเป็นค่าจริงไม่ได้
- **ทำไมต้องมี key (ใช้ SHA-256 เปล่าไม่ได้):** เลขบัตรประชาชนมีแค่ ~10¹² แบบ ใช้ GPU ไล่ hash ครบได้ในไม่กี่ชั่วโมง → ได้เลขบัตรทุกคนคืนโดยไม่ต้อง decrypt อะไรเลย / HMAC ที่มี secret key ไล่แบบนี้ไม่ได้
- **ทำไมแยกจาก DEK/KEK:** blind index ต้องได้ค่าเดียวกัน **ข้าม user** (ไม่งั้นค้นหา/เช็คซ้ำข้ามคนไม่ได้) จึงเป็น key เดียวทั้งระบบ ต่างจาก DEK ที่แยกต่อคน — และถ้าหลุด ข้อมูลยังอ่านไม่ได้ (แต่ทำ "เดาแล้วตรวจ" ได้ จึงต้องเก็บรักษาเท่ากับ KEK)
- **ใส่ label ใน HMAC เสมอ** (`email:`, `email-prefix:`, `phone-last4:` ...) — กันค่าเดียวกันแต่คนละประเภทได้ token ตรงกัน

### JWT_SECRET

- เซ็น JWT ที่ใช้ยืนยันการ login — ถ้าหลุด คนร้ายปลอม token เป็นใครก็ได้ → ต้องเก็บใน KMS/Vault ใน production

### สรุป

| Key | กี่ดอก | หน้าที่ | ถ้าหลุด | ถ้าหาย |
|---|---|---|---|---|
| **DEK** | 1 ต่อ user | encrypt ข้อมูล user | เสียข้อมูล 1 คน | ข้อมูลคนนั้นหาย (= ลบ) |
| **KEK** | 1 (+ เวอร์ชันเก่าระหว่าง rotate) | ล็อก DEK | ร่วมกับ DB dump = ข้อมูลทุกคน | **ข้อมูลทั้งหมดหาย** |
| **BLIND_INDEX_KEY** | 1 | HMAC สำหรับค้นหา | เดาค่าแล้วตรวจได้ | ค้นหาไม่ได้จนกว่าจะ rebuild index |
| **JWT_SECRET** | 1 | เซ็น token login | ปลอม login ได้ | ทุกคนต้อง login ใหม่ |

### รายละเอียดการ encrypt (`src/utility/crypto/cipher.ts`)

```
encrypt(DEK, "สมชาย", AAD = "<userId>:firstName")
  1. สุ่ม IV 12 bytes ใหม่ทุกครั้ง   → ค่าเดียวกันได้ ciphertext ต่างกัน ดูไม่ออกว่าใครซ้ำกับใคร
  2. AAD = "<userId>:<field>"         → เอา ciphertext ไปสลับ field หรือสลับ user → decrypt ไม่ผ่าน
  3. ได้ auth tag 16 bytes            → ciphertext ถูกแก้แม้ 1 bit → decrypt ไม่ผ่าน
  4. ผลลัพธ์ "v1." + base64(IV | tag | ciphertext)   (v1 = เผื่อเปลี่ยน algorithm ในอนาคต)
```

DEK ถูก wrap ด้วยวิธีเดียวกัน โดยใช้ context `dek:<userId>` เป็น AAD

---

## 4. โครงสร้างข้อมูลใน MongoDB

**`users`** — ไม่มี plaintext เลย

```js
{
  _id: ObjectId("6acc..."),
  pii: {                                   // AES-256-GCM ด้วย DEK ของ user
    firstName: "v1.KSoaxOAI...", lastName: "v1....", email: "v1....",
    citizenId: "v1....", phone: "v1....", address: "v1....",
    healthNote: "v1...."                   // ข้อมูลอ่อนไหว (มาตรา 26)
  },
  searchIdx: {                             // HMAC ด้วย BLIND_INDEX_KEY
    email: "07H7...",                      // ตรงตัว + unique
    emailPrefix: ["a1F...", "k9Q...", "Zp3..."],   // 3–5 ตัวแรกของส่วนหน้า @
    citizenId: "cMLv...",                  // ตรงตัว + unique
    citizenIdLast4: "Qw8...",
    phoneLast4: "Lm2...",
    firstNamePrefix: [...], lastNamePrefix: [...]
  },
  status: "active",                        // หรือ "erased"
  retentionUntil: ISODate("2031-10-11"),   // ครบกำหนดแล้ว job ลบอัตโนมัติ
  createdAt, updatedAt, erasedAt
}
```

**`data_keys`** — `{ _id: "<userId>", wrappedDek: "<base64>", kekVersion: "v1", rotatedAt }`
**`audit_logs`** — `{ actor: { id, role }, action, subjectId, fields, reason, result, createdAt }` (ไม่มี PII)
**`consent_documents`** — `{ version (unique), title, note, fileId, fileName, fileSize, sha256, uploadedBy: { id, role }, createdAt }` + ไฟล์ใน GridFS `consent_files.files / .chunks`
**`consents`** — `{ userId, action: accept|withdraw, documentId, version, reason, recordedBy: { id, role }, createdAt }` (append-only, ไม่มี PII)
**`staffs`** — บัญชีพนักงาน `{ username, passwordHash (Argon2id), displayName, role, isActive, failedLoginCount, lockedUntil, sessionVersion }`

> ที่อยู่และข้อมูลสุขภาพ **ไม่ทำ blind index โดยตั้งใจ** — ข้อมูลอ่อนไหวไม่ควรค้นหาได้

---

## 5. Login และ Role

### Flow login

```
POST /auth/login { username, password }
 1. หา staff จาก username
    - ไม่พบ → verify กับ hash หลอก (ให้เวลาตอบใกล้เคียงกัน) → 401 "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
 2. ถูกล็อกอยู่ (lockedUntil > now) → 403
 3. Bun.password.verify (Argon2id)
    - ผิด → failedLoginCount + 1 (ครบ 5 → ล็อก 15 นาที) → 401 ข้อความเดียวกับข้อ 1
 4. ถูก → ออก JWT { sub: staffId, ver: sessionVersion } อายุ 8 ชม.
        → ใส่ใน httpOnly cookie "pdpa_poc_token" (ไม่ส่งใน body, JavaScript อ่านไม่ได้)
 5. audit log: login ok / denied
```

### ทุก request หลัง login (`src/middleware/authentication.ts`)

```
cookie → verify JWT → โหลด staff จาก DB (isActive) → ตรวจ sessionVersion ตรงกับใน token
       → req.actor = { id, role }   ← role อ่านจาก DB ไม่ใช่จาก token
```

- เปลี่ยน role / ปิดบัญชีใน DB → มีผลทันที
- **logout** → เพิ่ม `sessionVersion` → token เก่าทุกตัวของบัญชีนั้นใช้ไม่ได้ทันที (JWT ไม่มีสถานะที่ server จึงต้องเพิกถอนเอง)

### Role (`src/constant/pdpa.ts` → `ROLE_POLICY`)

| สิทธิ์ | support | admin | dpo |
|---|---|---|---|
| ดูรายการ (mask เสมอ) | ✅ | ✅ | ✅ |
| เปิดดูข้อมูลเต็ม (ต้องระบุเหตุผล) | ❌ | ✅ ยกเว้นข้อมูลอ่อนไหว | ✅ ทั้งหมด |
| เพิ่ม user | ✅ | ✅ | ✅ |
| แก้ไข (ม.35) | ❌ | ✅ | ✅ |
| ส่งออกข้อมูล (ม.30, 31) | ❌ | ❌ | ✅ |
| ลบ (ม.33) | ❌ | ❌ | ✅ |
| ดู audit log | ❌ | ❌ | ✅ |
| บันทึกยอมรับ / ถอนความยินยอมแทนเจ้าของข้อมูล | ✅ | ✅ | ✅ |
| อัปโหลดเอกสาร PDPA เวอร์ชันใหม่ | ❌ | ❌ | ✅ |

- **support** — พนักงานด่านหน้า/call center: ยืนยันตัวตนจากข้อมูลที่ mask ไม่จำเป็นต้องเห็นค่าเต็ม (data minimization)
- **admin** — เจ้าหน้าที่หลังบ้าน: ตรวจเอกสาร แก้ไขข้อมูล แต่ไม่เห็นข้อมูลอ่อนไหว และไม่ส่งออก/ลบเอง
- **dpo** — Data Protection Officer (มาตรา 41–42): ดำเนินการตามคำขอของเจ้าของข้อมูล และตรวจ audit log
- `system` (ภายใน) — job ลบข้อมูลเมื่อครบระยะเวลาเก็บ / `anonymous` — ใช้ใน audit log ของ login ที่ไม่สำเร็จ

หลักที่ใช้: **least privilege**, **แยกหน้าที่** (คนแก้ ≠ คนลบ/ส่งออก), **ทุกการเข้าถึงข้อมูลเต็มตรวจสอบย้อนหลังได้**

---

## 6. Flow CRUD ของ user

ทุก endpoint ผ่าน: `authentication` → `validation` → `controller` → `service` → `repository`

### 6.1 Create — `POST /user` (`src/services/user/create.ts`)

```
1. ตรวจสิทธิ์ (ROLE_POLICY.create) — ไม่มีสิทธิ์ → 403 + audit denied
2. pickPii: trim, ตัด field ว่าง
3. สร้าง userId (ObjectId) ก่อน insert — เพราะต้องใช้ผูก DEK และ AAD
4. สร้าง DEK = randomBytes(32)
   → kms.wrap(DEK, "dek:<userId>") → data_keys { wrappedDek, kekVersion: KEK_CURRENT }
5. buildSearchIdx → HMAC ของ email, emailPrefix, citizenId, citizenIdLast4, phoneLast4, firstNamePrefix, lastNamePrefix
6. encryptFields → แต่ละ field: AES-256-GCM(DEK, value, AAD "<userId>:<field>")
7. insert users { pii, searchIdx, retentionUntil = now + RETENTION_DAYS }
   - email / เลขบัตรซ้ำ → unique index บน searchIdx error 11000
     → ลบ DEK ที่เพิ่งสร้าง (ไม่ทิ้ง key กำพร้า) → 409
8. audit log: create
```

DEK ตัวจริงอยู่ใน memory แค่ระหว่าง request — ไม่ถูกบันทึกที่ไหน

### 6.2 Read รายการ — `GET /user?search=&page=&pageSize=` (`src/services/user/list.ts`)

```
1. แปลงคำค้นเป็นเงื่อนไขบน searchIdx (ดูหัวข้อ 7)
2. query users { status: active, ...filter } sort createdAt + skip/limit + countDocuments
   → MongoDB กรอง/เรียง/ตัดหน้าให้เสร็จก่อน decrypt
3. เฉพาะ user ในหน้านั้น (ไม่เกิน pageSize): unwrap DEK → decrypt → mask
   - ชื่อ "ส***", อีเมล "s***@example.com", เลขบัตร "1-XXXX-XXXXX-45-8", เบอร์ "XXX-XXX-5678", ที่อยู่ "***"
   - ข้อมูลอ่อนไหว → "[REDACTED]" (ไม่ decrypt เลย)
4. audit log: list / search
```

- หน้ารายการ **mask เสมอทุก role** (แสดงหลายคนพร้อมกัน) — ดูค่าเต็มต้องเปิดทีละคนพร้อมเหตุผล
- decrypt + mask ทำที่ server — ค่าจริงไม่ออกไปใน response / network / cache ของเบราว์เซอร์
- เรียงได้แค่ `createdAt` — field ที่ encrypt เรียงตามตัวอักษรไม่ได้

### 6.3 Read รายคน / เปิดดูข้อมูลเต็ม — `GET /user/:id?reveal=true&reason=...` (`src/services/user/get.ts`)

```
1. reveal=true แต่ไม่มี reason → 400
2. หา user (active) → ไม่พบ → 404 + audit not_found
3. unwrap DEK → decryptView ตามระดับสิทธิ์
   - ไม่ขอ reveal / support   → mask
   - admin                    → PII เต็ม, ข้อมูลอ่อนไหว [REDACTED]
   - dpo                      → เต็มทั้งหมด
4. audit log: read + fields ที่ถูกเปิดเต็ม + reason
```

### 6.4 Update — `PUT /user/:id` (`src/services/user/update.ts`) — สิทธิขอแก้ไข มาตรา 35

```
1. ตรวจสิทธิ์ (admin, dpo)
2. pickPii — ไม่มี field ที่แก้ → 400
3. หา user (active) → unwrap DEK เดิม (ไม่สร้าง DEK ใหม่ เพราะ field อื่นยังล็อกด้วย DEK นี้)
4. encrypt เฉพาะ field ที่แก้ (IV ใหม่, AAD เดิม) + คำนวณ searchIdx ของ field นั้นใหม่
5. $set ด้วย dot notation: { "pii.phone": ..., "searchIdx.phoneLast4": ... } — field อื่นไม่ถูกแตะ
   - แก้ email / เลขบัตรไปซ้ำคนอื่น → 409
6. audit log: update + ชื่อ field (ไม่บันทึกค่าเก่า/ใหม่)
```

- **ไม่ re-wrap DEK** — ถ้า user สร้างตอน KEK v1 แก้ไขแล้วก็ยังเป็น v1 จนกว่าจะรัน `rotate-kek`
- หน้าเว็บไม่ดึงค่าจริงมาใส่ฟอร์มแก้ไข (กรอกเฉพาะช่องที่จะแก้) — ไม่ต้องถอดรหัสข้อมูลที่ไม่เกี่ยว

### 6.5 Delete — `DELETE /user/:id` body `{ reason }` (`src/services/user/remove.ts`) — สิทธิขอลบ มาตรา 33

```
1. ตรวจสิทธิ์ (dpo, system) + reason ห้ามว่าง
2. หา user (active) → ไม่พบ → 404
3. ทำลาย DEK: data_keys.deleteOne   ← crypto-shredding
4. ล้าง document: pii = {}, $unset searchIdx, status = erased, erasedAt = now
5. audit log: erase + reason
```

- ลำดับ "ลบ key ก่อน" ตั้งใจ: ถ้าล่มกลางทาง ข้อมูลยังอ่านไม่ได้ (ปลอดภัยกว่าเหลือ key ค้าง)
- document เหลือเป็น tombstone (ไม่มี PII) ให้ audit log อ้างถึงได้
- email / เลขบัตรเดิมสมัครใหม่ได้ (blind index ถูกลบแล้ว)
- **ย้อนกลับไม่ได้** และ ciphertext ใน backup ของ `users` ก็อ่านไม่ได้แล้ว

### 6.6 Export — `GET /user/:id/export` (`src/services/user/exportData.ts`) — มาตรา 30, 31

dpo เท่านั้น → decrypt ทุก field → คืน JSON `{ userId, exportedAt, data, metadata }` → audit log: export

### 6.7 ความยินยอม PDPA และเอกสารแบบมีเวอร์ชัน (`src/services/consent/`) — มาตรา 19, 23

**เอกสาร** (`consent_documents` + ไฟล์ PDF ใน GridFS bucket `consent_files`)

```
POST /consent-document?title=&note=&fileName=   body = ไฟล์ PDF ตรงๆ (Content-Type: application/pdf, ≤ 10 MB)
 1. ตรวจสิทธิ์ (ROLE_POLICY.document = dpo) — ไม่มีสิทธิ์ → 403 + audit denied
 2. ตรวจว่าขึ้นต้นด้วย "%PDF-" (ไม่เชื่อ Content-Type) → คำนวณ sha256
    - sha256 ตรงกับเวอร์ชันล่าสุด → 409 (อัปโหลดไฟล์เดิมซ้ำ)
 3. เขียนไฟล์ลง GridFS
 4. version = เวอร์ชันล่าสุด + 1 → insert consent_documents (unique index บน version)
    - อัปโหลดพร้อมกันได้เลขชน → ลองเลขถัดไป (สูงสุด 3 ครั้ง) / ล้มเหลว → ลบไฟล์ใน GridFS ทิ้ง
 5. audit log: upload_document
```

- ไม่มีการแก้ไข/ลบเวอร์ชันเก่า — เป็นหลักฐานว่าเจ้าของข้อมูลยอมรับข้อความใด, `sha256` ใช้ยืนยันว่าไฟล์ไม่ถูกเปลี่ยน
- เวอร์ชันล่าสุดมีผลทันที: user ที่ยอมรับเวอร์ชันเก่าจะมีสถานะ `outdated` (ต้องยอมรับใหม่)

**ความยินยอมของ user** (`consents` — append-only, ไม่มี PII มีแค่ `userId`)

```
สถานะ = record ล่าสุดของ user เทียบกับเวอร์ชันล่าสุดของเอกสาร
  ไม่มี record        → none
  ล่าสุดคือ withdraw  → withdrawn
  ล่าสุดคือ accept    → accepted (version ตรงกับล่าสุด) / outdated (เวอร์ชันเก่า)

POST /user   body { ...pii, consentVersion }
  มีเอกสารในระบบ → consentVersion ต้องเท่ากับเวอร์ชันล่าสุด (ไม่ส่ง → 400, ไม่ตรง → 409)
  บันทึก consent ก่อน user — สร้าง user ไม่สำเร็จ (เช่น อีเมลซ้ำ) → ลบ consent + DEK ทิ้ง

POST /user/:id/consent { action: "accept", version }      ← version ต้องเป็นล่าสุด ไม่งั้น 409
POST /user/:id/consent { action: "withdraw", reason }     ← ถอนได้ตลอด ต้องมีเหตุผล
  → audit log: consent / withdraw_consent
```

- staff เป็นคนกดบันทึกแทนเจ้าของข้อมูล (`recordedBy`) หลังเปิดเอกสารให้อ่าน
- การส่ง `version` ที่เปิดให้อ่านมาด้วย กันกรณี DPO อัปโหลดเวอร์ชันใหม่ระหว่างนั้น (ยอมรับเอกสารที่ไม่ได้อ่าน)
- การถอนความยินยอมไม่ลบข้อมูล — ถ้าเจ้าของข้อมูลขอลบด้วยต้องทำตาม 6.5 แยกต่างหาก
- ประวัติ consent เก็บไว้แม้ user ถูกลบ (crypto-shredding) เพราะไม่มี PII และเป็นหลักฐานทางกฎหมาย
- หน้ารายการ `GET /user` แนบ `consent: { status, version, latestVersion }` ของแต่ละคนมาด้วย

---

## 7. Flow การค้นหา (Search)

ข้อมูลถูก encrypt จึงใช้ regex ค้นไม่ได้ — ค้นผ่าน `searchIdx` (HMAC) เท่านั้น
`resolveSearch()` ใน `src/services/user/list.ts` เลือกวิธีจากรูปแบบคำค้น:

| คำค้น | ตัวอย่าง | ค้นที่ |
|---|---|---|
| มี `@` | `somchai@example.com` | `searchIdx.email` (ตรงตัว) |
| ตัวเลข 13 หลัก (มีขีดได้) | `1-1037-00123-45-8` | `searchIdx.citizenId` (ตรงตัว) |
| ตัวเลข 4 หลัก | `5678` | `searchIdx.phoneLast4` **หรือ** `searchIdx.citizenIdLast4` |
| ข้อความ ≥ 3 ตัว | `สมช`, `JOHN`, `som` | `firstNamePrefix` **หรือ** `lastNamePrefix` **หรือ** `emailPrefix` |
| อย่างอื่น | `สม`, `12345`, `ชาย` (กลางคำ) | 400 / ไม่พบ |

```
คำค้น "สมชายใจ"
 → normalize (trim, NFC, lowercase)
 → ตัดเหลือ 5 ตัวแรก (index เก็บไว้แค่ 3–5 ตัว) = "สมชาย"
 → HMAC("firstName-prefix:สมชาย"), HMAC("lastName-prefix:สมชาย"), HMAC("email-prefix:สมชาย")
 → find({ status: active, $or: [ ... ] })  ใช้ multikey index ได้ แบ่งหน้าได้ตามปกติ
 → decrypt + mask เฉพาะหน้าที่แสดง
```

**ทำไมออกแบบแบบนี้**

- **ตรงตัวกับ prefix แยก field กัน** — unique index บน array จะบังคับทุก element ห้ามซ้ำ (`somchai` กับ `somying` มี prefix `som` ร่วมกัน → สมัครคนที่สองไม่ได้) จึงให้ `email` (unique) แยกจาก `emailPrefix` (ไม่ unique)
- **prefix แทน n-gram (ค้นกลางคำ)** — n-gram รั่วรูปแบบข้อมูลมากกว่ามาก (จับกลุ่มคนที่มีชิ้นส่วนชื่อเหมือนกันได้)
- **4 ตัวท้ายแทนการค้นเบอร์บางส่วน** — ตรงกับการใช้งานจริง (call center) และรั่วน้อย
- **ภาษาไทย** — ตัดตาม code point (`Array.from`) และ normalize NFC ทั้งตอนเก็บและตอนค้น
- **ข้อจำกัด** — คำค้นยาวเกิน 5 ตัวถูกตัดเหลือ 5 จึงอาจได้ผลเกินมาบ้าง, ค้นกลางคำไม่ได้, เปลี่ยน `BLIND_INDEX_KEY` ต้อง rebuild index ทั้งหมด

ทุก index ที่เพิ่มคือข้อมูลที่ได้มาจาก PII — เพิ่มเฉพาะที่มี use case ชัดเจน และบันทึกความเสี่ยงไว้ใน DPIA

---

## 8. Flow งานดูแลระบบ

### เปลี่ยน KEK (key rotation) — `bun run rotate-kek`

```
1. เพิ่ม KEK_V2 ใน .env และตั้ง KEK_CURRENT=v2  (เก็บ KEK_V1 ไว้!)
   → restart: user เดิมยังอ่านได้ (unwrap ด้วย v1 ตาม kekVersion), user ใหม่ wrap ด้วย v2
2. bun run rotate-kek
   ทุก data_keys ที่ kekVersion ≠ v2:
     unwrap ด้วย KEK_V1 → ได้ DEK ตัวเดิม → wrap ด้วย KEK_V2
     → updateOne { wrappedDek, kekVersion: "v2" } พร้อมกันใน update เดียว (atomic)
   ข้อมูลใน users ไม่ถูกแตะเลย (DEK ตัวเดิม)
3. ตรวจ db.data_keys.countDocuments({ kekVersion: "v1" }) === 0 แล้วจึงลบ KEK_V1
```

⚠️ ลบ KEK เก่าก่อน re-wrap ครบ = ข้อมูลของ user กลุ่มนั้นหายถาวร
⚠️ ห้ามแก้ `kekVersion` ใน DB ตรงๆ — ต้อง re-wrap `wrappedDek` ไปพร้อมกัน

### ลบตามระยะเวลาเก็บ — `src/jobs/retention.ts`

รันตอนเริ่ม server และทุก 24 ชม.: หา user ที่ `retentionUntil < now` → เรียก flow ลบเดียวกับ 6.5 ด้วย actor `system`

### สร้าง blind index ใหม่ — `bun run rebuild-search-idx`

ใช้เมื่อเปลี่ยน `BLIND_INDEX_KEY` หรือเปลี่ยนกติกา index: decrypt ทุก user → `buildSearchIdx` → `$set searchIdx` → `syncIndexes()`

### บัญชีพนักงาน — `bun run seed-staff`

สร้าง/รีเซ็ต `support01`, `admin01`, `dpo01` ด้วยรหัส `SEED_STAFF_PASSWORD` (ปลดล็อก + เพิกถอน session เดิม)

---

## 9. API

Base: `/api/v1` — response รูปแบบ `{ code, status, errors, payload }`

| Method | Path | สิทธิ์ |
|---|---|---|
| POST | `/auth/login` body `{ username, password }` | ทุกคน |
| POST | `/auth/logout` | login แล้ว |
| GET | `/auth/me` | login แล้ว |
| GET | `/user?search=&page=&pageSize=` | ทุก role (mask เสมอ) |
| GET | `/user/:id?reveal=true&reason=` | ทุก role (เห็นเต็มตามสิทธิ์) |
| POST | `/user` body `{ ...pii, consentVersion }` | ทุก role |
| GET | `/user/:id/consent` (สถานะ + เอกสารล่าสุด + ประวัติ) | ทุก role |
| POST | `/user/:id/consent` body `{ action: accept, version }` / `{ action: withdraw, reason }` | ทุก role |
| GET | `/consent-document` (ทุกเวอร์ชัน ใหม่สุดก่อน) / `/consent-document/latest` | ทุก role |
| GET | `/consent-document/:version/file` (PDF) | ทุก role |
| POST | `/consent-document?title=&note=&fileName=` body PDF (`application/pdf`) | dpo |
| PUT | `/user/:id` | admin, dpo |
| GET | `/user/:id/export` | dpo |
| DELETE | `/user/:id` body `{ reason }` | dpo |
| GET | `/audit-log?category=&action=&result=&username=&subjectId=&from=&to=&page=&pageSize=` (ทุกตัวกรองไม่บังคับ, เติมชื่อพนักงานให้ตอนแสดง; `category=auth` = login/logout, `category=data` = action อื่นทั้งหมด) | dpo |

Validation สำคัญ: อีเมล, checksum เลขบัตรประชาชนไทย 13 หลัก, เบอร์โทร, `pageSize` ≤ 100

---

## 10. โครงสร้างโฟลเดอร์

```
src/
├── config/                      env (zod) — key, JWT, cookie, retention
├── constant/pdpa.ts             data classification, ROLE_POLICY
├── routers/                     เส้นทาง + validation (express-validator)
├── controllers/                 รับ request / ตอบ response, main.ts = successRes / errRes
├── services/
│   ├── auth/                    login
│   ├── user/                    create, list(search), get(reveal), update, remove, exportData, purgeExpired
│   │   └── helpers.ts           encryptFields, decryptView, buildSearchIdx, สิทธิ์
│   ├── consent/                 เอกสาร PDPA (อัปโหลด/เวอร์ชัน/ไฟล์) + ยอมรับ/ถอนความยินยอม
│   └── auditLog/
├── repositories/                คุย DB เท่านั้น
│   ├── user/  dataKey/  staff/  auditLog/  consent/  consentDocument/ (GridFS)
├── externals/
│   ├── kms/                     KeyProvider — POC: LocalKeyProvider (env) → เปลี่ยนเป็น KMS/Vault ได้ที่นี่ที่เดียว
│   └── mongo/collections/       schema: users, data_keys, staffs, audit_logs, consent_documents, consents (+ gridfs.ts)
├── middleware/                  authentication, validationHandler, cors, globalErrorHandler
├── utility/
│   ├── crypto/cipher.ts         AES-256-GCM + AAD
│   ├── crypto/blindIndex.ts     HMAC, prefix, normalize
│   └── helper/                  mask, jwt, authCookie, auditLog
├── jobs/retention.ts
├── models/dto/  models/business/
└── types/
scripts/                         genKeys, seedStaff, rotateKek, rebuildSearchIdx
```

---

## 11. ความปลอดภัยและข้อควรระวัง

- **ไม่มี PII ใน log** — morgan บันทึกแค่ method/path/status (ไม่มี query string), validation error ไม่ส่งค่าที่กรอกกลับ, audit log มีแค่ id และชื่อ field
- **ข้อมูลอ่อนไหว (มาตรา 26)** ไม่ถูก decrypt เลยถ้าไม่มีสิทธิ์ และไม่ทำ blind index
- **crypto-shredding สมบูรณ์เมื่อ** backup ของ `data_keys` หมดอายุเร็วกว่า backup ของ `users` — ถ้า restore `data_keys` เก่ากลับมา DEK ที่ลบแล้วจะกลับมาด้วย
- **`.env` ใน POC ปลอดภัยพอๆ กับ server** — ใครเจาะ server ได้จะได้ทั้ง KEK และสิทธิ์เข้า DB ประโยชน์เต็มของ envelope encryption จะได้เมื่อย้าย KEK ไป KMS
- **ทำ backup ของ key** แยกจากข้อมูลและเก็บอย่างปลอดภัย — KEK หาย = ข้อมูลหายทั้งหมด
- **ทดสอบกับ DB แยกเสมอ** — ตรวจ host/db ที่ API/script พิมพ์ตอนเริ่มทุกครั้ง อย่าให้ script ทดสอบมีคำสั่ง drop database

### ข้อจำกัดที่รู้อยู่

- ยังไม่จำกัดจำนวน login ต่อ IP (มีแค่ล็อกรายบัญชี)
- logout เพิกถอน session ทุกเครื่องของบัญชีนั้น
- ทั้ง 3 บัญชี seed ใช้รหัสผ่านเดียวกัน / ยังไม่มีหน้าจัดการพนักงานหรือเปลี่ยนรหัสผ่าน
- แก้ไขลบค่า field ให้ว่างไม่ได้ (ช่องว่าง = ไม่เปลี่ยน) และ admin เขียนทับข้อมูลสุขภาพได้ทั้งที่มองไม่เห็น
- การลบไม่ได้ตรวจข้อยกเว้นตามกฎหมาย (เช่น ต้องเก็บตามกฎหมายบัญชี/ภาษี) — ต้องให้ DPO พิจารณา
- หน้า list unwrap DEK 1 ครั้งต่อ user — เมื่อใช้ KMS ควร cache DEK ระยะสั้น

---

## 12. ก่อนขึ้น production

- [ ] ย้าย KEK, `BLIND_INDEX_KEY`, `JWT_SECRET` ไป KMS / Vault (implement `KeyProvider` ใน `src/externals/kms`)
- [ ] cache DEK ใน memory (TTL สั้น) เพื่อลด latency/ค่าใช้จ่าย KMS
- [ ] แยก `data_keys` ไปคนละ DB/cluster, จำกัดสิทธิ์, ตั้ง backup retention สั้นกว่า `users`
- [ ] TLS ระหว่าง app ↔ MongoDB และ encryption at rest ของ MongoDB/disk
- [ ] `COOKIE_SECURE=true` บน HTTPS (+ CSRF token ถ้าใช้ `SameSite=None`), rate limit การ login ต่อ IP
- [ ] ระบบจัดการบัญชีพนักงาน / เปลี่ยนรหัสผ่าน / ขั้นตอนอนุมัติ (เช่น admin ขอลบ → dpo อนุมัติ)
- [ ] consent แยกตามวัตถุประสงค์ (granular — เช่น การตลาด, ส่งต่อบุคคลที่สาม) และช่องทางให้เจ้าของข้อมูลกดยอมรับเอง (ตอนนี้ staff บันทึกแทน)
- [ ] ด้านกระบวนการ: ฐานทางกฎหมาย / consent (ม.19, 24, 26), privacy notice (ม.23), RoPA (ม.39), DPO (ม.41), DPIA, แผนแจ้งเหตุข้อมูลรั่วไหลภายใน 72 ชม. (ม.37(4)), สัญญากับผู้ประมวลผลข้อมูล

> หมายเหตุ: `bson` ถูก pin ไว้ที่ 7.2.0 และ mongoose `~9.4.1` (เหมือน citizen-portal-api) เพราะเวอร์ชันใหม่กว่าใช้กับ Bun 1.3.x ไม่ได้
