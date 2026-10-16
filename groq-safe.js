const API_KEY = "YOUR_GROQ_API_KEY"; // Ganti dengan API Key Groq kamu (gsk_...)

async function autoAnswerGoogleForm() {
  console.log("🔍 Mencari model AI yang aktif...");
  let selectedModel = "";
  try {
    const resModel = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${API_KEY}` }
    });
    const dataModel = await resModel.json();
    if (dataModel.data && dataModel.data.length > 0) {
      const textModels = dataModel.data.filter(m => 
        !m.id.includes("guard") && !m.id.includes("embed") && 
        !m.id.includes("whisper") && !m.id.includes("safeguard")
      );
      const preferred = textModels.find(m => m.id.includes("llama") || m.id.includes("mixtral") || m.id.includes("gemma"));
      selectedModel = preferred ? preferred.id : textModels[0].id;
      console.log(`✅ Model dipilih: "${selectedModel}"`);
    }
  } catch (err) {
    console.error("❌ Gagal terhubung ke API Groq:", err);
    return;
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`🚀 Ditemukan ${elemenSoal.length} soal. Memulai pengisian...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];
    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    const elemenOpsi = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));
    if (elemenOpsi.length === 0) continue;

    const daftarOpsi = elemenOpsi.map(opsi => (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim());
    const promptText = `Soal: ${teksSoal}\nPilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\nPilih jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut. Jangan menambah nomor, tanda baca, atau penjelasan apapun.`;

    let berhasil = false;
    let percobaan = 0;

    while (!berhasil && percobaan < 3) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
          body: JSON.stringify({ model: selectedModel, messages: [{ role: "user", content: promptText }] })
        });

        if (response.status === 429) {
          percobaan++;
          console.warn(`⏳ Terkena rate limit di soal ${i + 1}. Menunggu 3 detik...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        const data = await response.json();
        const jawabanAI = data.choices?.[0]?.message?.content?.trim();

        if (jawabanAI) {
          const opsiCocok = elemenOpsi.find(opsi => {
            const label = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
            return label.toLowerCase().includes(jawabanAI.toLowerCase()) || jawabanAI.toLowerCase().includes(label.toLowerCase());
          });

          if (opsiCocok) {
            opsiCocok.click();
            console.log(`✅ Soal ${i + 1}: Terisi -> "${jawabanAI}"`);
          } else {
            console.warn(`❓ Soal ${i + 1}: AI menjawab "${jawabanAI}", tapi opsi tidak cocok persis.`);
          }
        }
        berhasil = true;
      } catch (err) {
        console.error(`❌ Error pada soal ${i + 1}:`, err);
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));
  }
  console.log("🎉 Proses selesai! Silakan periksa jawaban di layar.");
}

autoAnswerGoogleForm();
