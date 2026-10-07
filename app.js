let map;
let markers = [];
let infoWindow;
let lokasiPengguna;
let semuaCafe = [];
const KUNCI_FAVORIT = "cafe-finder:favorit";

function ambilFavorit() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_FAVORIT)) || [];
  } catch {
    return [];
  }
}

function toggleFavorit(id) {
  const favorit = ambilFavorit();
  const idx = favorit.indexOf(id);
  if (idx === -1) favorit.push(id);
  else favorit.splice(idx, 1);
  localStorage.setItem(KUNCI_FAVORIT, JSON.stringify(favorit));
}

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  const pusatDefault = { lat: -6.2, lng: 106.8167 }; // cadangan kalau lokasi ditolak

  map = new Map(document.getElementById("map"), {
    center: pusatDefault,
    zoom: 14,
    mapId: "DEMO_MAP_ID", // dibutuhkan oleh marker versi baru
  });

  ambilLokasiPengguna();
}

function ambilLokasiPengguna() {
  if (!navigator.geolocation) {
    alert("Browser kamu tidak mendukung Geolocation.");
    return;
  }
  navigator.geolocation.getCurrentPosition(berhasil, gagal);
}

async function berhasil(posisi) {
  const lokasi = {
    lat: posisi.coords.latitude,
    lng: posisi.coords.longitude,
  };

  map.setCenter(lokasi);
  map.setZoom(15);

  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  new AdvancedMarkerElement({ map, position: lokasi, title: "Lokasi kamu" });
  lokasiPengguna = lokasi;
  cariCafe();
}

async function tampilkanCafe(places) {
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { InfoWindow } = await google.maps.importLibrary("maps");

  const daftar = document.getElementById("daftar-cafe");
  daftar.innerHTML = "";
  markers.forEach((m) => (m.map = null)); // hapus marker lama
  markers = [];
  if (places.length === 0) {
    daftar.textContent = "Tidak ada cafe yang cocok.";
  }
  infoWindow = infoWindow || new InfoWindow();

  places.forEach((place) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: place.location,
      title: place.displayName,
    });
    markers.push(marker);

    const bukaDetail = async () => {
      infoWindow.setContent("Memuat...");
      infoWindow.open({ map, anchor: marker });
      map.panTo(place.location);

      try {
        await place.fetchFields({
          fields: ["regularOpeningHours", "photos", "googleMapsURI"],
        });
      } catch (err) {
        console.error("Gagal mengambil detail:", err);
      }

      const isi = document.createElement("div");
      isi.className = "detail-cafe";

      // Foto (kalau ada)
      const foto = place.photos?.[0];
      if (foto) {
        const img = document.createElement("img");
        img.src = foto.getURI({ maxWidth: 300 });
        img.alt = `Foto ${place.displayName}`;
        isi.appendChild(img);
      }

      const nama = document.createElement("strong");
      nama.textContent = place.displayName;

      const info = document.createElement("div");
      info.textContent = `Rating: ${place.rating ?? "-"} | ${place.formattedAddress}`;

      // Jam buka hari ini
      const jam = document.createElement("div");
      const deskripsi = place.regularOpeningHours?.weekdayDescriptions;
      if (deskripsi) {
        const indeksHariIni = (new Date().getDay() + 6) % 7; // Senin = 0
        jam.textContent = deskripsi[indeksHariIni];
      } else {
        jam.textContent = "Jam buka tidak tersedia";
      }

      isi.append(nama, info, jam);

      // Link ke Google Maps
      if (place.googleMapsURI) {
        const link = document.createElement("a");
        link.href = place.googleMapsURI;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Buka di Google Maps";
        isi.appendChild(link);
      }

      infoWindow.setContent(isi);
    };

    marker.addListener("click", bukaDetail);

    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${place.displayName} (${place.rating ?? "-"})`;

    const tombol = document.createElement("button");
    tombol.className = "tombol-favorit";
    tombol.setAttribute("aria-label", `Favoritkan ${place.displayName}`);
    const perbarui = () => {
      tombol.textContent = ambilFavorit().includes(place.id) ? "♥" : "♡";
    };
    perbarui();

    tombol.addEventListener("click", (e) => {
      e.stopPropagation(); // supaya tidak ikut membuka detail
      toggleFavorit(place.id);
      perbarui();
      if (document.getElementById("filter-favorit").checked) render();
    });

    li.append(label, tombol);
    li.addEventListener("click", bukaDetail);
    daftar.appendChild(li);
  });
}

function gagal(error) {
  console.error(error);
  alert("Gagal mendapatkan lokasi: " + error.message);
}

async function cariCafe() {
  if (!lokasiPengguna) return;
  const radius = Number(document.getElementById("radius").value);
  const { Place, SearchNearbyRankPreference } =
    await google.maps.importLibrary("places");

  const request = {
    fields: ["id", "displayName", "location", "rating", "formattedAddress"],
    locationRestriction: { center: lokasiPengguna, radius },
    includedPrimaryTypes: ["cafe"],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
    language: "id",
  };

  try {
    const { places } = await Place.searchNearby(request);
    semuaCafe = places;
    render();
  } catch (err) {
    console.error("Gagal mencari cafe:", err);
  }
}

function render() {
  const hanyaFavorit = document.getElementById("filter-favorit").checked;
  const favorit = ambilFavorit();
  const hasil = hanyaFavorit
    ? semuaCafe.filter((p) => favorit.includes(p.id))
    : semuaCafe;
  tampilkanCafe(hasil);
}

document.getElementById("radius").addEventListener("change", cariCafe);
document.getElementById("filter-favorit").addEventListener("change", render);
window.initMap = initMap;
