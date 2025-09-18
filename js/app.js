// ========== 지도 기본 세팅 ==========
const map = L.map("map").setView([46.5, 105.0], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ========== 마커 클러스터 ==========
const markers = L.markerClusterGroup({
  zoomToBoundsOnClick: false,
  spiderfyOnClick: true
});

const list = Array.isArray(window.photos) ? window.photos : [];

// 마커 생성
list.forEach(photo => {
  const lat = Number(photo.GPSLatitude);
  const lng = Number(photo.GPSLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const m = L.marker([lat, lng]);
  m.photoData = photo;
  markers.addLayer(m);
});

map.addLayer(markers);

// ========== 마커/클러스터 클릭 → 슬라이드쇼 ==========
markers.on("clusterclick", (ev) => {
  const clusterPhotos = [];
  ev.layer.getAllChildMarkers().forEach(m => clusterPhotos.push(m.photoData));
  openSlideshow(clusterPhotos);
});

markers.on("click", (ev) => {
  openSlideshow([ev.layer.photoData]);
});

// ========== 오른쪽 사진 목록 구성 ==========
buildPhotoList(list);

function buildPhotoList(arr) {
  const container = document.getElementById("photo-list");
  if (!container) return;
  container.innerHTML = "";

  // 날짜가 있으면 최신순 정렬 (없으면 그대로)
  const sorted = [...arr].sort((a, b) => {
    const da = Date.parse(a.DateTimeOriginal || a.CreateDate || "") || 0;
    const db = Date.parse(b.DateTimeOriginal || b.CreateDate || "") || 0;
    return db - da;
  });

  sorted.forEach((p, idx) => {
    const src = p.SourceFile || p.file || (p.FileName ? `image/converted/${p.FileName}` : "");
    const item = document.createElement("div");
    item.className = "photo-item";
    item.setAttribute("data-index", idx);

    // 썸네일 + 메타
    item.innerHTML = `
      <img class="thumb" src="${src}" alt="${p.FileName || "photo"}" />
      <div class="meta">
        <div class="name">${escapeHtml(p.FileName || p.Title || "사진")}</div>
        <div class="date">${escapeHtml(p.DateTimeOriginal || p.CreateDate || "")}</div>
      </div>
    `;

    // 클릭 → 해당 사진만 슬라이드쇼
    item.addEventListener("click", () => {
      openSlideshow([p]);
      // 해당 지점으로 지도 살짝 이동(있으면)
      if (Number.isFinite(+p.GPSLatitude) && Number.isFinite(+p.GPSLongitude)) {
        map.setView([+p.GPSLatitude, +p.GPSLongitude], Math.max(map.getZoom(), 8));
      }
    });

    container.appendChild(item);
  });
}

// 안전한 텍스트 출력용
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

// ========== 슬라이드쇼 모달 ==========
function openSlideshow(photoList) {
  const modal = document.getElementById("slideshow-modal");
  const wrapper = modal.querySelector(".swiper-wrapper");
  wrapper.innerHTML = "";

  photoList.forEach(p => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    const src = p.SourceFile || p.file || (p.FileName ? `image/converted/${p.FileName}` : "");
    slide.innerHTML = `
      <img src="${src}" alt="${escapeHtml(p.FileName || "")}" />
      <p>${escapeHtml(p.DateTimeOriginal || "")}</p>
    `;
    wrapper.appendChild(slide);
  });

  modal.style.display = "flex";

  // 간단히 매번 새로 생성
  new Swiper(".swiper", {
    loop: true,
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    pagination: { el: ".swiper-pagination", clickable: true }
  });
}

// 닫기
document.getElementById("close-slideshow").addEventListener("click", () => {
  document.getElementById("slideshow-modal").style.display = "none";
});
document.getElementById("slideshow-modal").addEventListener("click", (e) => {
  if (e.target.id === "slideshow-modal") e.currentTarget.style.display = "none";
});
