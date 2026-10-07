let map;
let markers = [];
let infoWindow;

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
  cariCafe(lokasi);
}

async function tampilkanCafe(places) {
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { InfoWindow } = await google.maps.importLibrary("maps");

  const daftar = document.getElementById("daftar-cafe");
  daftar.innerHTML = "";
  markers.forEach((m) => (m.map = null)); // hapus marker lama
  markers = [];
  infoWindow = infoWindow || new InfoWindow();

  places.forEach((place) => {
    const marker = new AdvancedMarkerElement({
      map,
      position: place.location,
      title: place.displayName,
    });
    markers.push(marker);

    const bukaDetail = () => {
      const isi = document.createElement("div");
      const nama = document.createElement("strong");
      nama.textContent = place.displayName;
      const info = document.createElement("div");
      info.textContent = `Rating: ${place.rating ?? "-"} | ${place.formattedAddress}`;
      isi.append(nama, info);

      infoWindow.setContent(isi);
      infoWindow.open({ map, anchor: marker });
      map.panTo(place.location);
    };

    marker.addListener("click", bukaDetail);

    const li = document.createElement("li");
    li.textContent = `${place.displayName} (${place.rating ?? "-"})`;
    li.addEventListener("click", bukaDetail);
    daftar.appendChild(li);
  });
}

function gagal(error) {
  console.error(error);
  alert("Gagal mendapatkan lokasi: " + error.message);
}

async function cariCafe(lokasi) {
  const { Place, SearchNearbyRankPreference } =
    await google.maps.importLibrary("places");

  const request = {
    fields: ["displayName", "location", "rating", "formattedAddress"],
    locationRestriction: {
      center: lokasi,
      radius: 1000, // meter
    },
    includedPrimaryTypes: ["cafe"],
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
    language: "id",
  };

  try {
    const { places } = await Place.searchNearby(request);
    console.log("Jumlah cafe ditemukan:", places.length);
    tampilkanCafe(places); // <-- ini yang menggantikan forEach console.log
  } catch (err) {
    console.error("Gagal mencari cafe:", err);
  }
}

window.initMap = initMap;
