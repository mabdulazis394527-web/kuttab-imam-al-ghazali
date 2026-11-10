# Jelajah Kuttab Imam Al-Ghazali

Game jelajah kampus Kuttab Imam Al-Ghazali dalam tampilan **2D atau 3D**: masjid, tempat wudhu, gedung kelas dua lantai, perpustakaan, kantor mudir, kantin, dan plang bervisi. Santri menuntaskan 10 misi adab untuk meraih syahadah.

> Visi: Mewujudkan insan Qur'ani dengan kemandirian iman, amal sholih, dan pemikiran sehingga mampu menjalani kehidupan yang adil dan beradab.

## Main
Buka **https://kuttabghazali.pages.dev**. Pilih tampilan 3D atau 2D di layar awal, atau ganti kapan saja dengan tombol **2D·3D** (keyboard: V). Di HP, pilih **Tambahkan ke Layar Utama** agar terpasang seperti aplikasi dan bisa dibuka offline.

## Kurikulum
- **Iqra' jilid 1–6**: soal dibuat otomatis dari huruf hijaiyah berharakat, mad, tanwin, sukun, tasydid, alif lam, dan hukum nun/mim mati.
- **Al-Qur'an 30 juz**: baca per surah dengan terjemahan, setoran di Kelas Tahfidz, dan muroja'ah di masjid (tes lanjutan ayat).
- **Bahasa Arab**: 12 tema dalam 3 tingkat (mubtadi', mutawassith, mutaqaddim).
- **Adab**: 12 tema dalam 3 tingkat, lengkap dengan dalil, ditambah kumpulan doa harian.

## Aksi di dunia kuttab
- Memungut sampah dan memilahnya ke tempat sampah organik (hijau) atau anorganik (kuning).
- Mengetuk pintu sebelum masuk ruangan, membuka dan menutup keran saat wudhu.
- Duduk di majelis kelas, duduk di bantal muroja'ah masjid, dan makan sambil duduk di kantin. Makan sambil berdiri memunculkan peringatan.

## Karakter yang hidup
- Santri mencari jalan sendiri (pathfinding) di sekitar bangunan, pohon, bangku, dan kolam. Mereka lebih memilih jalan setapak dan tidak menginjak taman bunga, melambat atau memberi jalan saat berpapasan, duduk di bangku, saling mengucap salam, dan menyapa pemain.
- Ruqayyah berinisiatif memungut sampah dan membuangnya ke tempat sampah yang sesuai.
- Sepak bola 2 lawan 2 (Tim Putih lawan Tim Marun) dengan papan skor, penjaga gawang, dan adab bermain: bismillah saat kick-off, "afwan" saat bersenggolan, memuji gol lawan. Pemain bisa ikut menggiring atau menendang bola (tombol A/E).

## Adab dan suara
- Kartu adab muncul setiap melewati pintu: salam saat masuk gerbang dan ruangan, doa masuk dan keluar masjid, takbir saat naik dan tasbih saat turun tangga, doa penutup majelis saat keluar kelas, dan basmalah sebelum wudhu. Pertama kali disertai kuis.
- Doa belajar sebelum pelajaran, doa setelah makan di kantin, dan mendoakan teman yang bersin.
- Suara dibuat langsung oleh browser: kicau burung samar, riuh anak-anak bermain (lebih ramai di dekat lapangan), gemericik air mancur, langkah kaki, dan lonceng. Atur lewat tombol speaker (nyala/mati, volume suasana dan efek, bacaan doa, kartu adab tampil/ringkas).

## Kontrol
- Jalan: tombol panah / WASD (ponsel: tombol arah)
- Bicara & masuk: E atau Spasi (ponsel: tombol A)
- Kamera 3D: seret layar/mouse untuk memutar, scroll atau cubit untuk zoom (keyboard: Z/X)
- M: daftar misi · N: denah · V: ganti 2D/3D

## Isi folder
- `index.html` — seluruh aplikasi (satu file)
- `three.min.js` — Three.js r158 untuk tampilan 3D (dimuat hanya saat memilih 3D)
- `manifest.webmanifest`, `sw.js` — agar bisa dipasang dan berjalan offline
- `icon-*.png`, `apple-touch-icon.png` — ikon aplikasi

## Lisensi data
Teks Al-Qur'an Utsmani dari The Noble Qur'an Encyclopedia (quranenc.com). Terjemahan Indonesia dari [quran-json](https://github.com/risan/quran-json) oleh Risan Bagja Pradana, CC BY-SA 4.0. Pembagian juz dari [quran-meta](https://github.com/quran-center/quran-meta) (MIT). Lihat `quran/LICENSE.txt`.
