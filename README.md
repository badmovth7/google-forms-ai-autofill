# 🤖 Google Forms Auto Answer via AI API (Vision & Multi-Select Supported)

Skrip otomatisasi browser console untuk membaca soal Google Form, menganalisis teks maupun **soal bergambar**, memproses jawaban menggunakan AI API terbaru, dan memilih opsi jawaban secara otomatis di layar.

---

## ✨ Fitur-Fitur Utama

* 📸 **Vision / Multimodal Support:** Mampu membaca dan menganalisis soal bergambar (grafik, diagram, rumus) menggunakan model Vision atau otomatis *fallback* ke model teks jika model vision tidak tersedia.
* ☑️ **Multi-Select (Checkbox) Support:** Mendeteksi soal centang yang memiliki **lebih dari satu jawaban benar** dan mencentang semua opsi yang tepat secara otomatis.
* ⏩ **Auto-Skip Biodata:** Otomatis melompati kolom identitas seperti *Nama, NIM/NPM, Email, Kelas, No. HP*, dan isian teks tanpa pilihan.
* 🔍 **Smart Model Detection (Updated Models):** Otomatis mendeteksi model aktif terbaru di Groq (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, dll.) dan mengabaikan model audio/TTS/guardrail agar terhindar dari error `400 Bad Request`.
* ⏳ **Rate Limit & Safety Handler:** Dilengkapi sistem penanganan *HTTP 429 (Rate Limit)* dengan jeda aman.
* 🛡️ **Review Before Submit:** Skrip hanya mencentang pilihan di layar tanpa menekan tombol *Submit*, sehingga kamu tetap bisa meninjau ulang semua jawaban.

---

## 📂 Pilihan Versi Skrip

| Nama File | API Provider | Jeda Per Soal | Fitur Utama & Penggunaan |
| :--- | :--- | :--- | :--- |
| **`groq-safe.js`** | Groq (`GPT-OSS` / `Qwen` / `Vision`) | 2.5 Detik | **Sangat Direkomendasikan.** Aman dari pembatasan kuota (*rate limit 429*), mendukung soal bergambar & jawaban majemuk. Cocok untuk ujian 50–100+ soal. |
| **`groq-fast.js`** | Groq (`GPT-OSS` / `Qwen` / `Vision`) | 1 Detik | Versi cepat untuk kuis kilat dengan jumlah soal sedikit (<30 soal). |
| **`gemini-auto.js`** | Google AI Studio (`Gemini 2.0 Flash`) | 1 Detik | Sangat akurat untuk soal bergambar kompleks & rumus. Wajib menggunakan API Key dari akun `@gmail.com` pribadi. |

---

## 🚀 Cara Penggunaan

1. **Dapatkan API Key Gratis:**
   * **Groq API:** Dapatkan di [console.groq.com/keys](https://console.groq.com/keys).
   * **Gemini API:** Dapatkan di [aistudio.google.com](https://aistudio.google.com) (*Wajib login dengan akun Gmail pribadi*).

2. **Jalankan Skrip di Browser:**
   * Buka formulir Google Form yang ingin diisi.
   * Tekan **F12** (atau Klik Kanan $\rightarrow$ **Inspect**) lalu masuk ke tab **Console**.
   * Salin seluruh kode dari salah satu file (`groq-safe.js`, `groq-fast.js`, atau `gemini-auto.js`).
   * Ganti isi variabel `API_KEY` pada baris pertama kodingan dengan API Key milikmu:
     ```javascript
     const API_KEY = "gsk_API_KEY_KAMU_DI_SINI";
     ```
   * Tempelkan kode ke dalam Console browser lalu tekan **Enter**.

3. **Selesai:**
   * Perhatikan log pada Console. Pilihan jawaban di layar akan terisi secara otomatis satu per satu.
   * Periksa kembali jawaban sebelum menekan tombol **Submit**.

---

⚠️ **Disclaimer:** Repositori ini dibuat hanya untuk tujuan edukasi, pembelajaran manipulasi DOM browser, serta eksplorasi kemampuan Vision & REST API dari Large Language Models (LLM).
