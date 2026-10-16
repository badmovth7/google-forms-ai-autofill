const API_KEY = "YOUR_GROQ_API_KEY"; // Ganti dengan API Key Groq milikmu (gsk_...)

async function autoAnswerGoogleFormFast() {
  if (!API_KEY || API_KEY === "YOUR_GROQ_API_KEY") {
    console.error("❌ API Key Groq belum diisi! Masukkan API Key kamu di baris pertama.");
    return;
  }

  console.log("🔍 Mencari model AI generatif teks yang aktif di akun Groq...");
  
  let selectedModel = "";
  try {
    const resModel = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
    const dataModel = await resModel.json();
    
    if (dataModel.data && dataModel.data.length > 0) {
      // Menyaring hanya model generatif teks (mengabaikan guard/embed/whisper)
      const textModels = dataModel.data.filter(m => 
        !m.id.includes("guard") && 
        !m.id.includes("embed") && 
        !m.id.includes("whisper") &&
        !m.id.includes("safeguard")
      );

      if (textModels.length > 0) {
        const preferred = textModels.find(m => 
          m.id.includes("llama") || m.id.includes("mixtral") || m.id.includes("gemma")
        );
        selectedModel = preferred ? preferred.id : textModels[0].id;
        console.log(`✅ Model generatif dipilih: "${selectedModel}"`);
      } else {
        console.error("❌ Tidak ditemukan model generatif teks pada akun Groq ini.");
        return;
      }
    } else {
      console.error("❌ Tidak ada model yang tersedia pada akun Groq ini.");
      return;
    }
  } catch (err) {
    console.error("❌ Gagal terhubung ke Groq API:", err);
    return;
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`⚡ Ditemukan ${elemenSoal.length} soal. Memulai pengisian versi cepat (jeda 1 detik)...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];
    
    // 1. Ekstraksi Teks Soal
    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    // 2. Ekstraksi Pilihan Jawaban
    const elemenOpsi = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));
    if (elemenOpsi.length === 0) continue;

    const daftarOpsi = elemenOpsi.map(opsi => {
      return (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
    });

    // 3. Susun Prompt Khusus
    const promptText = `Soal: ${teksSoal}\nPilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\nPilih jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut. Jangan menambah nomor, tanda baca, atau penjelasan apapun.`;

    try {
      // 4. Kirim Request ke Groq API
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: promptText }]
        })
      });

      const data = await response.json();

      if (data.error) {
        console.error(`❌ Error pada soal ${i + 1}:`, data.error.message || data.error);
        continue;
      }

      const jawabanAI = data.choices?.[0]?.message?.content?.trim();

      if (!jawabanAI) {
        console.warn(`⚠️ Soal ${i + 1}: Respon AI kosong.`);
        continue;
      }

      // 5. Pencocokan Jawaban dan Auto Click
      const opsiCocok = elemenOpsi.find(opsi => {
        const label = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
        return label.toLowerCase().includes(jawabanAI.toLowerCase()) || jawabanAI.toLowerCase().includes(label.toLowerCase());
      });

      if (opsiCocok) {
        opsiCocok.click();
        console.log(`✅ Soal ${i + 1}: Terisi -> "${jawabanAI}"`);
      } else {
        console.warn(`❓ Soal ${i + 1}: AI menjawab "${jawabanAI}", tapi tidak ada opsi yang cocok persis.`);
      }

    } catch (err) {
      console.error(`❌ Error pada soal ${i + 1}:`, err);
    }

    // Jeda 1 detik per soal (Versi Cepat)
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🎉 Proses selesai! Silakan periksa kembali jawaban di layar.");
}

autoAnswerGoogleFormFast();
