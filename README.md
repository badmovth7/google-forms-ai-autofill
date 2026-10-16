# 🤖 Google Forms Auto Answer via AI API

Skrip otomatisasi browser console untuk membaca soal Google Form, memproses jawaban menggunakan API AI, dan memilih opsi jawaban secara otomatis langsung di layar.

---

## 📂 Pilihan Versi Skrip

| Nama File | API Provider | Kecepatan / Jeda | Keterangan & Penggunaan |
| :--- | :--- | :--- | :--- |
| **`groq-safe.js`** | Groq (Llama 3 / Mixtral) | 2.5 Detik | **Sangat Direkomendasikan.** Dilengkapi fitur penanganan otomatis jika terkena *rate limit*. Sangat aman untuk formulir banyak soal (50–100+ soal). |
| **`groq-fast.js`** | Groq (Llama 3 / Mixtral) | 1 Detik | Untuk pengisian cepat pada formulir berjumlah soal sedikit sampai sedang (<30 soal). |
| **`gemini-auto.js`** | Google AI Studio (Gemini 2.0 Flash) | 1 Detik | Menggunakan model `gemini-2.0-flash`. Wajib menggunakan API Key dari akun Gmail pribadi. |

---

## ✨ Fitur Utama

* **Auto Model Detection:** Otomatis mendeteksi model generatif teks yang aktif di akun API tanpa perlu menentukan nama model secara manual.
* **Smart Model Filtering:** Otomatis menyaring dan mengabaikan model keamanan atau pemindai khusus agar respon AI murni berupa teks pilihan jawaban.
* **Rate Limit Handler:** Memiliki fitur jeda dan percobaan ulang otomatis saat batas kuota API tercapai.
* **Safe Mode (Review Before Submit):** Skrip hanya memilih pilihan di layar tanpa menekan tombol *Submit*, sehingga jawaban bisa diperiksa kembali.

---

## 🚀 Cara Penggunaan

1. **Dapatkan API Key:**
   * **Groq:** Buat API Key gratis di [console.groq.com/keys](https://console.groq.com/keys).
   * **Gemini:** Buat API Key gratis di [aistudio.google.com](https://aistudio.google.com) menggunakan akun Gmail pribadi.

2. **Jalankan Skrip di Browser:**
   * Buka formulir Google Form yang ingin diisi.
   * Tekan tombol **F12** (atau Klik Kanan -> **Inspect**) lalu buka tab **Console**.
   * Pilih salah satu file skrip di repositori ini (`groq-safe.js`, `groq-fast.js`, atau `gemini-auto.js`), lalu salin seluruh kodenya.
   * Ganti isi variabel `API_KEY` pada baris pertama kodingan dengan API Key milikmu.
   * Tempelkan kode ke Console browser lalu tekan **Enter**.

3. **Selesai:**
   * Perhatikan jalannya proses pada log Console. Pilihan jawaban di Google Form akan tercentang otomatis satu per satu.

---

⚠️ **Disclaimer:** Repositori ini dibuat hanya untuk tujuan edukasi, pembelajaran manipulasi DOM browser, dan pemahaman integrasi REST API AI.
