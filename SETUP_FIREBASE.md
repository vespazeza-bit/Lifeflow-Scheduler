# คู่มือตั้งค่า Firebase Push Notifications สำหรับ LifeFlow

## ภาพรวม
ระบบแจ้งเตือนใช้ Firebase Cloud Messaging (FCM) เพื่อส่ง Push Notification ไปยังเบราว์เซอร์ของผู้ใช้
เมื่อถึงเวลาก่อนกิจกรรมตามที่ตั้งไว้

---

## ขั้นตอนที่ 1: สร้าง Firebase Project

1. ไปที่ [https://console.firebase.google.com](https://console.firebase.google.com)
2. คลิก **"Add project"** (หรือ **"Create a project"**)
3. ตั้งชื่อโปรเจค เช่น `lifeflow-scheduler`
4. เลือกว่าจะเปิด/ปิด Google Analytics (ไม่บังคับ)
5. คลิก **"Create project"** และรอจนเสร็จ

---

## ขั้นตอนที่ 2: เพิ่ม Web App และรับ firebaseConfig

1. ใน Firebase Console → คลิกไอคอน **Web** (`</>`) เพื่อเพิ่ม Web App
2. ตั้งชื่อ App nickname เช่น `LifeFlow Web`
3. คลิก **"Register app"**
4. คัดลอก `firebaseConfig` ที่แสดงขึ้นมา ซึ่งมีรูปแบบดังนี้:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "lifeflow-xxxx.firebaseapp.com",
  projectId: "lifeflow-xxxx",
  storageBucket: "lifeflow-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. คลิก **"Continue to console"**

---

## ขั้นตอนที่ 3: เปิดใช้ Cloud Messaging

1. ใน Firebase Console → ไปที่ **Project Settings** (ไอคอนเฟือง ⚙️ ด้านบนซ้าย)
2. คลิกแท็บ **"Cloud Messaging"**
3. ตรวจสอบว่า Cloud Messaging API (V1) เปิดใช้งานอยู่ (หากมีปุ่ม Enable ให้คลิก)

---

## ขั้นตอนที่ 4: สร้าง VAPID Key (Web Push Certificate)

1. ยังอยู่ในแท็บ **"Cloud Messaging"**
2. เลื่อนลงมาที่ส่วน **"Web configuration"** → **"Web Push certificates"**
3. คลิก **"Generate key pair"**
4. คัดลอก Key ที่ได้ (ยาวมาก) — นี่คือ `VAPID_KEY`

---

## ขั้นตอนที่ 5: สร้าง Service Account Key (สำหรับ Backend)

1. ใน Project Settings → คลิกแท็บ **"Service accounts"**
2. คลิก **"Generate new private key"**
3. คลิก **"Generate key"** เพื่อยืนยัน
4. ไฟล์ JSON จะถูกดาวน์โหลดมา — เก็บไว้ให้ดี (ห้ามเผยแพร่สู่สาธารณะ)
5. เปิดไฟล์ JSON นั้น จะมีข้อมูลดังนี้:

```json
{
  "type": "service_account",
  "project_id": "lifeflow-xxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxx@lifeflow-xxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}
```

---

## ขั้นตอนที่ 6: กรอก Config ลงในไฟล์โปรเจค

### 6.1 ไฟล์ `client/src/firebase.js`

เปิดไฟล์ `d:/Lifeflow Scheduler/client/src/firebase.js` และแทนที่ค่า placeholder:

```js
const firebaseConfig = {
  apiKey: "AIza...",               // จาก Step 2
  authDomain: "lifeflow-xxxx.firebaseapp.com",
  projectId: "lifeflow-xxxx",
  storageBucket: "lifeflow-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const VAPID_KEY = "BK...";        // จาก Step 4
```

### 6.2 ไฟล์ `client/public/firebase-messaging-sw.js`

เปิดไฟล์ `d:/Lifeflow Scheduler/client/public/firebase-messaging-sw.js` และแทนที่ค่า placeholder
ด้วย firebaseConfig เดียวกันกับข้างบน:

```js
firebase.initializeApp({
  apiKey: "AIza...",
  authDomain: "lifeflow-xxxx.firebaseapp.com",
  projectId: "lifeflow-xxxx",
  storageBucket: "lifeflow-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
});
```

### 6.3 ไฟล์ `server/firebase-config.js`

เปิดไฟล์ `d:/Lifeflow Scheduler/server/firebase-config.js` และแทนที่ด้วยข้อมูลจากไฟล์ JSON ใน Step 5:

```js
module.exports = {
  serviceAccount: {
    type: "service_account",
    project_id: "lifeflow-xxxx",
    private_key_id: "abc123...",
    private_key: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-xxxx@lifeflow-xxxx.iam.gserviceaccount.com",
    client_id: "123456789",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  }
};
```

> หมายเหตุ: `private_key` ต้องมี `\n` ในสตริง (คัดลอกจากไฟล์ JSON ตรง ๆ ได้เลย)

---

## ขั้นตอนที่ 7: รีสตาร์ท Server

```bash
# หยุด server เดิมก่อน (Ctrl+C)
# แล้วรัน server ใหม่
cd "d:/Lifeflow Scheduler/server"
node index.js
```

หรือใช้ `start.bat` ที่มีอยู่แล้ว

---

## วิธีการใช้งานระบบแจ้งเตือน

1. เปิดแอป LifeFlow ในเบราว์เซอร์
2. คลิกไอคอน **🔕** (กระดิ่ง) ที่มุมล่างซ้ายของ Sidebar
3. เบราว์เซอร์จะขอสิทธิ์ Notifications → คลิก **"Allow"**
4. ไอคอนจะเปลี่ยนเป็น **🔔** (สีม่วง) แสดงว่าเปิดแล้ว
5. ระบบจะส่ง Push Notification ก่อนเวลากิจกรรมตาม `notify_before` ที่ตั้งไว้

---

## หมายเหตุสำคัญ

- Push Notifications ต้องใช้ **HTTPS** หรือ `localhost` เท่านั้น
- ไฟล์ `server/firebase-config.js` ห้าม commit ขึ้น Git (เพิ่มใน `.gitignore`)
- Cron job จะทำงานทุก 1 นาที และใช้เวลา **ประเทศไทย (UTC+7)** ในการเปรียบเทียบ
- หากเปลี่ยนเบราว์เซอร์หรืออุปกรณ์ ต้องกดเปิดการแจ้งเตือนใหม่อีกครั้ง
