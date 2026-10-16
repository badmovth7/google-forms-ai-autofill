const API_KEY = "YOUR_GROQ_API_KEY"; // Ganti dengan API Key Groq kamu (gsk_...)

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

async function autoAnswerGoogleFormFast() {
  if (!API_KEY || API_KEY === "YOUR_GROQ_API_KEY") {
    console.error("❌ API Key Groq belum diisi! Masukkan API Key kamu di baris pertama.");
    return;
  }

  console.log("🔍 Mengecek daftar model Groq...");
  let textModel = "openai/gpt-oss-120b";
  let visionModel = null;

  try {
    const resModel = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
    const dataModel = await resModel.json();

    if (dataModel.data && dataModel.data.length > 0) {
      const validKws = ["gpt-oss", "qwen", "llama", "mixtral", "gemma", "deepseek"];
      const foundText = dataModel.data.find(m => {
        const id = m.id.toLowerCase();
        return validKws.some(kw => id.includes(kw)) &&
               !id.includes("guard") && !id.includes("embed") && !id.includes("whisper") &&
               !id.includes("orpheus") && !id.includes("tts") && !id.includes("stt") &&
               !id.includes("audio") && !id.includes("vision");
      });
      if (foundText) textModel = foundText.id;

      const foundVision = dataModel.data.find(m => {
        const id = m.id.toLowerCase();
        return id.includes("vision") && !id.includes("guard") && !id.includes("embed");
      });
      if (foundVision) visionModel = foundVision.id;
    }
    console.log(`⚡ Model Teks: "${textModel}" ${visionModel ? `| Model Vision: "${visionModel}"` : '| Vision: (Fallback Teks)'}`);
  } catch (err) {
    console.warn("⚠️ Menggunakan model teks standar.");
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`⚡ Ditemukan ${elemenSoal.length} elemen soal. Memulai versi cepat...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];

    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    const isBio = /nama|nim|npm|email|kelas|prodi|jurusan|biodata|no\.?\s*hp|nomor\s*hp/i.test(teksSoal.toLowerCase());
    const elemenOpsi = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));

    if (isBio || elemenOpsi.length === 0) {
      console.log(`⏩ Soal ${i + 1} dilewati (Biodata / Isian Teks).`);
      continue;
    }

    const isCheckbox = elemenOpsi.some(el => el.getAttribute('role') === 'checkbox');

    const daftarOpsi = elemenOpsi.map((opsi, idx) => {
      const rawLabel = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
      return rawLabel ? rawLabel : `Opsi ${idx + 1}`;
    });

    const imgEls = Array.from(item.querySelectorAll('img')).filter(img => {
      const src = img.src || '';
      return src && !src.includes('avatar') && !src.includes('cleardot.gif') && (img.naturalWidth > 30 || img.clientWidth > 30 || src.includes('googleusercontent'));
    });
    
    let imgData = null;
    if (imgEls.length > 0) {
      imgData = await getImgBase64(imgEls[0]);
    }

    let promptText = `Soal: ${teksSoal}\n`;
    if (imgData) promptText += `(Perhatikan gambar pada soal jika ada)\n`;
    promptText += `Pilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\n`;

    if (isCheckbox) {
      promptText += `PETUNJUK: Soal ini BISA MEMILIKI LEBIH DARI SATU JAWABAN. Sebutkan SEMUA jawaban yang benar, dipisahkan oleh baris baru (newline).`;
    } else {
      promptText += `PETUNJUK: Pilih HANYA 1 jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut.`;
    }

    let activeModel = (imgData && visionModel) ? visionModel : textModel;
    let contentPayload = (imgData && visionModel) ? [
      { type: "image_url", image_url: { url: `data:${imgData.mimeType};base64,${imgData.base64data}` } },
      { type: "text", text: promptText }
    ] : promptText;

    try {
      let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

      let data = await response.json();

      if (data.error && activeModel !== textModel) {
        console.warn(`⚠️ Vision model gagal: "${data.error.message}". Mengalihkan ke model teks...`);
        visionModel = null;
        activeModel = textModel;
        contentPayload = promptText;

        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        data = await response.json();
      }

      if (data.error) {
        console.error(`❌ Error pada soal ${i + 1}:`, data.error.message || data.error);
        continue;
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
    } catch (err) {
      console.error(`❌ Error pada soal ${i + 1}:`, err);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🎉 Proses pengisian selesai! Silakan periksa kembali jawaban di layar.");
}

autoAnswerGoogleFormFast();
