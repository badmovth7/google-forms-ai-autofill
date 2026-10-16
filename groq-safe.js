const API_KEY = "YOUR_GROQ_API_KEY"; // Ganti dengan API Key Groq kamu (gsk_...)

// Helper: Konversi elemen gambar ke Base64 via Canvas & Fetch
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

async function autoAnswerGoogleFormSafe() {
  if (!API_KEY || API_KEY === "YOUR_GROQ_API_KEY") {
    console.error("❌ API Key Groq belum diisi! Masukkan API Key kamu di baris pertama.");
    return;
  }

  console.log("🔍 Mengecek daftar model Teks & Vision di Groq...");
  let textModel = "llama-3.3-70b-versatile";
  let visionModel = "llama-3.2-11b-vision-preview";

  try {
    const resModel = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
    const dataModel = await resModel.json();

    if (dataModel.data && dataModel.data.length > 0) {
      const validTextKws = ["llama", "mixtral", "gemma", "deepseek", "qwen"];
      
      const foundText = dataModel.data.find(m => {
        const id = m.id.toLowerCase();
        return validTextKws.some(kw => id.includes(kw)) &&
               !id.includes("guard") && !id.includes("embed") && !id.includes("whisper") &&
               !id.includes("orpheus") && !id.includes("tts") && !id.includes("stt") &&
               !id.includes("audio") && !id.includes("vision");
      });
      if (foundText) textModel = foundText.id;

      const foundVision = dataModel.data.find(m => {
        const id = m.id.toLowerCase();
        return (id.includes("vision") || id.includes("llama-3.2")) &&
               !id.includes("guard") && !id.includes("embed");
      });
      if (foundVision) visionModel = foundVision.id;
    }
    console.log(`✅ Model Teks: "${textModel}" | Model Vision: "${visionModel}"`);
  } catch (err) {
    console.warn("⚠️ Menggunakan nama model standar Groq.");
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`🚀 Ditemukan ${elemenSoal.length} elemen soal. Memulai pengisian...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];

    // 1. Ekstraksi Judul Soal
    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    // 2. Filter Biodata / Identitas / Isian Teks Singkat
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

    // 5. Ekstraksi Gambar (Jika ada)
    const imgEls = Array.from(item.querySelectorAll('img')).filter(img => {
      const src = img.src || '';
      return src && !src.includes('avatar') && !src.includes('cleardot.gif') && (img.naturalWidth > 30 || img.clientWidth > 30 || src.includes('googleusercontent'));
    });
    
    let imgData = null;
    if (imgEls.length > 0) {
      imgData = await getImgBase64(imgEls[0]);
    }

    // 6. Susun Prompt
    let promptText = `Soal: ${teksSoal}\n`;
    if (imgData) promptText += `(Perhatikan gambar yang dilampirkan pada soal)\n`;
    promptText += `Pilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\n`;

    if (isCheckbox) {
      promptText += `PETUNJUK: Soal ini BISA MEMILIKI LEBIH DARI SATU JAWABAN. Sebutkan SEMUA jawaban yang benar. Tuliskan setiap jawaban yang dipilih persis seperti teks opsi di atas, dipisahkan oleh baris baru (newline).`;
    } else {
      promptText += `PETUNJUK: Pilih HANYA 1 jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut tanpa nomor atau penjelasan.`;
    }

    // 7. Susun Payload API Groq
    const activeModel = imgData ? visionModel : textModel;
    let contentPayload;

    if (imgData) {
      contentPayload = [
        { type: "image_url", image_url: { url: `data:${imgData.mimeType};base64,${imgData.base64data}` } },
        { type: "text", text: promptText }
      ];
    } else {
      contentPayload = promptText;
    }

    let berhasil = false;
    let percobaan = 0;

    while (!berhasil && percobaan < 3) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: [{ role: "user", content: contentPayload }]
          })
        });

        if (response.status === 429) {
          percobaan++;
          console.warn(`⏳ Rate limit di soal ${i + 1}. Menunggu 3.5 detik...`);
          await new Promise(r => setTimeout(r, 3500));
          continue;
        }

        const data = await response.json();
        if (data.error) {
          console.error(`❌ Error pada soal ${i + 1}:`, data.error.message || data.error);
          break;
        }

        const jawabanAI = data.choices?.[0]?.message?.content?.trim();

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
        berhasil = true;

      } catch (err) {
        console.error(`❌ Error pada soal ${i + 1}:`, err);
        break;
      }
    }

    // Jeda 2.5 detik per soal
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log("🎉 Proses pengisian selesai! Silakan periksa kembali jawaban di layar.");
}

autoAnswerGoogleFormSafe();
