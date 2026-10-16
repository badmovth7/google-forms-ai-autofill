const API_KEY = "YOUR_GEMINI_API_KEY"; // Wajib berawalan 'AIzaSy...' dari akun @gmail.com pribadi

async function autoAnswerGoogleForm() {
  if (!API_KEY.startsWith("AIzaSy")) {
    console.error("❌ Gunakan API Key Gemini dari akun Gmail pribadi (berawalan 'AIzaSy...')!");
    return;
  }

  const elemenSoal = document.querySelectorAll('div[role="listitem"]');
  console.log(`🚀 Ditemukan ${elemenSoal.length} soal. Memulai pengisian via Gemini...`);

  for (let i = 0; i < elemenSoal.length; i++) {
    const item = elemenSoal[i];
    const judulEl = item.querySelector('div[role="heading"]') || item.querySelector('[aria-level]');
    if (!judulEl) continue;
    const teksSoal = judulEl.innerText.replace(/\n/g, ' ').trim();

    const elemenOpsi = Array.from(item.querySelectorAll('[role="radio"], [role="checkbox"]'));
    if (elemenOpsi.length === 0) continue;

    const daftarOpsi = elemenOpsi.map(opsi => (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim());
    const promptText = `Soal: ${teksSoal}\nPilihan Jawaban:\n${daftarOpsi.map((o, idx) => `${idx + 1}.${o}`).join('\n')}\n\nPilih jawaban yang paling tepat. Balas HANYA dengan menyalin persis teks opsi jawaban tersebut. Jangan menambah nomor, tanda baca, atau penjelasan apapun.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });

      const data = await response.json();
      const jawabanAI = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (jawabanAI) {
        const opsiCocok = elemenOpsi.find(opsi => {
          const label = (opsi.getAttribute('aria-label') || opsi.closest('label')?.innerText || opsi.innerText || "").trim();
          return label.toLowerCase().includes(jawabanAI.toLowerCase()) || jawabanAI.toLowerCase().includes(label.toLowerCase());
        });

        if (opsiCocok) {
          opsiCocok.click();
          console.log(`✅ Soal ${i + 1}: Terisi -> "${jawabanAI}"`);
        } else {
          console.warn(`❓ Soal ${i + 1}: AI menjawab "${jawabanAI}", tapi opsi tidak cocok.`);
        }
      }
    } catch (err) {
      console.error(`❌ Error pada soal ${i + 1}:`, err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("🎉 Proses selesai! Silakan periksa jawaban di layar.");
}

autoAnswerGoogleForm();
