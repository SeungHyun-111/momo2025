/* js/app.js
 * photos.js의 데이터 배열(이미지 경로 포함)을 100% 신뢰해서 사용하도록 전면 수정.
 * photos.js 예시:
 *   const photos = [
 *     { FileName: "GPS_170.JPG", GPSLatitude:46.9, GPSLongitude:103.8, DateTimeOriginal:"2025:09:05 12:34:56" },
 *     { SourceFile:"image/converted/GPS_223.JPG", ... },
 *     { path:"image/converted/GPS_234.JPG", ... },
 *     ...
 *   ]
 */

// ---------- 헬퍼: 사진 경로 해석 ----------
function resolveSrc(p) {
  // 가장 확실한 키부터 검사 (여기에 있는 키들 중 아무거나 하나만 있어도 됨)
  const candidate =
    p.SourceFile || p.src || p.url || p.path || p.file || p.image ||
    (p.FileName ? p.FileName : "");

  if (!candidate) return "";

  // FileName만 주어진 경우 기본 경로 보강
  // 이미 경로가 포함돼 있으면 그대로 사용
  return candidate.includes("/")
    ? candidate
    : `image/converted/${candidate}`;
}

// ---------- 데이터 로드 ----------
const data = (typeof photos !== "undefined" && Array.isArray(photos)) ? photos : [];

// ---------- 지도 ----------
const map = L.map("map");
map.setView([46.5, 105.0], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// 레이아웃 변화 시 지도 리사이즈
window.addEventListener("resize", () => map.invalidateSize());
setTimeout(() => map.invalidateSize(), 50);

// ---------- 마커 클러스터 ----------
const markers = L.markerClusterGroup({
  zoomToBoundsOnClick: false,
  spiderfyOnClick: true
});

// 데이터에서 마커 생성
data.forEach(p => {
  const lat = Number(p.GPSLatitude);
  const lng = Number(p.GPSLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const m = L.marker([lat, lng]);
  m.photoData = p;
  markers.addLayer(m);
});

map.addLayer(markers);

// 마커/클러스터 클릭 시 슬라이드쇼
markers.on("clusterclick", (ev) => {
  const arr = [];
  ev.layer.getAllChildMarkers().forEach(m => arr.push(m.photoData));
  openSlideshow(arr);
});

markers.on("click", (ev) => {
  openSlideshow([ev.layer.photoData]);
});

// ---------- 오른쪽 목록: 초기엔 전체 사진 노출 ----------
buildPhotoList(data);

function buildPhotoList(arr) {
  const container = document.getElementById("photo-list");
  if (!container) return;
  container.innerHTML = "";

  // 날짜가 있으면 최신순 정렬
  const sorted = [...arr].sort((a, b) => {
    const da = Date.parse(a.DateTimeOriginal || a.CreateDate || "") || 0;
    const db = Date.parse(b.DateTimeOriginal || b.CreateDate || "") || 0;
    return db - da;
  });

  sorted.forEach((p) => {
    const src = resolveSrc(p);
    const item = document.createElement("div");
    item.className = "photo-item";

    item.innerHTML = `
      <img class="thumb" src="${src}" alt="${escapeHtml(p.FileName || p.Title || "photo")}" />
      <div class="meta">
        <div class="name">${escapeHtml(p.Title || p.FileName || "사진")}</div>
        <div class="date">${escapeHtml(p.DateTimeOriginal || p.CreateDate || "")}</div>
      </div>
    `;

    // 목록 클릭 → 해당 사진만 슬라이드쇼 + 지도 이동
    item.addEventListener("click", () => {
      openSlideshow([p]);
      const lat = Number(p.GPSLatitude), lng = Number(p.GPSLongitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.setView([lat, lng], Math.max(map.getZoom(), 8));
      }
    });

    container.appendChild(item);
  });
}

// ---------- 슬라이드쇼 모달 ----------
function openSlideshow(photoList) {
  const modal = document.getElementById("slideshow-modal");
  const wrapper = modal.querySelector(".swiper-wrapper");
  wrapper.innerHTML = "";

  photoList.forEach(p => {
    const src = resolveSrc(p);
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <img src="${src}" alt="${escapeHtml(p.FileName || p.Title || "")}" />
      <p>${escapeHtml(p.DateTimeOriginal || p.CreateDate || "")}</p>
    `;
    wrapper.appendChild(slide);
  });

  modal.style.display = "flex";

  // 매번 새로 생성(간단하고 안전)
  new Swiper(".swiper", {
    loop: true,
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    pagination: { el: ".swiper-pagination", clickable: true }
  });
}

// 모달 닫기
document.getElementById("close-slideshow").addEventListener("click", () => {
  document.getElementById("slideshow-modal").style.display = "none";
});
document.getElementById("slideshow-modal").addEventListener("click", (e) => {
  if (e.target.id === "slideshow-modal") e.currentTarget.style.display = "none";
});

// ---------- 유틸 ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}
