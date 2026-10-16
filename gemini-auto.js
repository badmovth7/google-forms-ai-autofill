const API_KEY = "YOUR_GEMINI_API_KEY"; // Wajib berawalan 'AIzaSy...' dari akun @gmail.com pribadi

async function getImgBase64(imgEl) {
  try {
    if (!imgEl || !imgEl.src) return null;
    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth || imgEl.clientWidth || 300;
    canvas.height = imgEl.naturalHeight || imgEl.clientHeight || 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (dataUrl && dataUrl.startsWith('data:image')) {
      const parts = dataUrl.split(',');
      return { mimeType: 'image/jpeg', base64data: parts[1] };
    }
  } catch (e) {}

  try {
    const res = await fetch(imgEl.src);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const parts = reader.result.split(',');
        resolve({ mimeType: blob.type || 'image/jpeg', base64data: parts[1] });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
}

async function autoAnswerGoogleFormGemini() {
  if (!API_KEY.startsWith("AIzaSy")) {
    console.error("❌ Gunakan API Key Gemini dari akun Gmail pribadi (berawalan 'AIzaSy...')!");
    return;
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`🚀 Ditemukan ${elemenSoal.length} elemen soal. Memulai pengisian via Gemini 2.0 Flash...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];

    // 1. Ekstraksi Judul Soal
    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    // 2. Filter Biodata & Isian Teks
    const isBio = /nama|nim|npm|email|kelas|prodi|jurusan|biodata|no\.?\s*hp|nomor\s*hp/i.test(teksSoal.toLowerCase());
    const elemenOpsi = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));

    if (isBio || elemenOpsi.length === 0) {
      console.log(`⏩ Soal ${i + 1} dilewati (Biodata / Isian teks).`);
      continue;
    }

    // 3. Deteksi Tipe Soal (Radio vs Checkbox)
    const isCheckbox = elemenOpsi.some(el => el.getAttribute('role') === 'checkbox');

    // 4. Ekstraksi Pilihan Jawaban
    const daftarOpsi = elemenOpsi.map((opsi, idx) => {
      const rawLabel = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
      return rawLabel ? rawLabel : `Opsi ${idx + 1}`;
    });

    // 5. Ekstraksi Gambar
    const imgEls = Array.from(item.querySelectorAll('img')).filter(img => {
      const src = img.src || '';
      return src && !src.includes('avatar') && !src.includes('cleardot.gif') && (img.naturalWidth > 30 || img.clientWidth > 30 || src.includes('googleusercontent'));
    });
    
    let imgData = null;
    if (imgEls.length > 0) {
      imgData = await getImgBase64(imgEls[0]);
    }

    // 6. Susun Prompt & Parts Payload
    let promptText = `Soal: ${teksSoal}\n`;
    if (imgData) promptText += `(Perhatikan gambar yang dilampirkan pada soal)\n`;
    promptText += `Pilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\n`;

    if (isCheckbox) {
      promptText += `PETUNJUK: Soal ini BISA MEMILIKI LEBIH DARI SATU JAWABAN. Sebutkan SEMUA jawaban yang benar. Tuliskan setiap jawaban yang dipilih persis seperti teks opsi di atas, dipisahkan oleh baris baru (newline).`;
    } else {
      promptText += `PETUNJUK: Pilih HANYA 1 jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut tanpa nomor atau penjelasan.`;
    }

    const parts = [];
    if (imgData) {
      parts.push({ inline_data: { mime_type: imgData.mimeType, data: imgData.base64data } });
    }
    parts.push({ text: promptText });

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      const data = await response.json();
      if (data.error) {
        console.error(`❌ Error pada soal ${i + 1}:`, data.error.message || data.error);
        continue;
      }

      const jawabanAI = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (jawabanAI) {
        const barisJawaban = jawabanAI.split('\n').map(s => s.replace(/^[\d\-*\s\.\)\(]+/g, '').trim()).filter(Boolean);

        let countClick = 0;
        elemenOpsi.forEach(opsi => {
          const label = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim().toLowerCase();
          const isMatch = barisJawaban.some(jwb => {
            const jwbLower = jwb.toLowerCase();
            return label === jwbLower || label.includes(jwbLower) || jwbLower.includes(label);
          });

          if (isMatch) {
            const isChecked = opsi.getAttribute('aria-checked') === 'true' || opsi.checked;
            if (!isChecked) {
              opsi.click();
              countClick++;
            }
          }
        });

        if (countClick > 0) {
          console.log(`✅ Soal ${i + 1}: Terisi (${countClick} opsi dipilih) -> "${jawabanAI.replace(/\n/g, ' | ')}"`);
        } else {
          console.warn(`❓ Soal ${i + 1}: AI menjawab "${jawabanAI.replace(/\n/g, ' | ')}", tapi opsi tidak cocok.`);
        }
      }
    } catch (err) {
      console.error(`❌ Error pada soal ${i + 1}:`, err);
    }

    // Jeda 1 detik per soal
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🎉 Proses pengisian selesai! Silakan periksa kembali jawaban di layar.");
}

autoAnswerGoogleFormGemini();
