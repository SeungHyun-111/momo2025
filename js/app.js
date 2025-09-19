/* js/app.js
 * - 지도 이동/확대에 따라 우측 목록을 지도 범위로 필터링
 * - 클러스터 클릭 시: 우측 목록을 해당 클러스터 집합으로 즉시 동기화
 * - 단일 모달/슬라이드쇼 재사용, (N/N)+촬영일시 캡션, loop 경고 방지 포함
 */

// ---------- 헬퍼: 사진 경로 해석 ----------
function resolveSrc(p) {
  const candidate =
    p.SourceFile || p.src || p.url || p.path || p.file || p.image ||
    (p.FileName ? p.FileName : "");
  if (!candidate) return "";
  return candidate.includes("/") ? candidate : `image/converted/${candidate}`;
}

// ---------- 데이터 로드 ----------
const data = (typeof photos !== "undefined" && Array.isArray(photos)) ? photos : [];

// 현재 사이드에 표시 중인 리스트(지도 범위/클러스터 기준). 초기엔 전체.
let currentList = [...data];

// ---------- 지도 ----------
const map = L.map("map");
// ✅ 초기 지도 중심 좌표/확대 수준
map.setView([46.5, 105.0], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

window.addEventListener("resize", () => map.invalidateSize());
setTimeout(() => map.invalidateSize(), 50);

// ---------- 마커 클러스터 ----------
const markers = L.markerClusterGroup({
  zoomToBoundsOnClick: false,
  spiderfyOnClick: true
});

data.forEach(p => {
  const lat = Number(p.GPSLatitude);
  const lng = Number(p.GPSLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const m = L.marker([lat, lng]);
  m.photoData = p;
  markers.addLayer(m);
});

map.addLayer(markers);

// ---------- 슬라이드쇼 모달 ----------
let swiperInstance = null;

function openSlideshow(photoList, startIndex = 0) {
  const modal = document.getElementById("slideshow-modal");
  const wrapper = modal.querySelector(".swiper-wrapper");
  wrapper.innerHTML = "";

  photoList.forEach(p => {
    const src = resolveSrc(p);
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `<img src="${src}" alt="${escapeHtml(p.FileName || p.Title || "")}" />`;
    wrapper.appendChild(slide);
  });

  // 캡션 컨테이너 (두 줄: (N/N), 촬영일시)
  let caption = modal.querySelector(".swiper-caption");
  if (!caption) {
    caption = document.createElement("div");
    caption.className = "swiper-caption";
    Object.assign(caption.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      width: "100%",
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      textAlign: "center",
      fontSize: "13px",
      lineHeight: "1.4",
      padding: "6px 4px"
    });
    modal.querySelector(".modal-inner").appendChild(caption);
  }

  modal.style.display = "flex";

  if (swiperInstance) {
    swiperInstance.destroy(true, true);
    swiperInstance = null;
  }

  swiperInstance = new Swiper(".swiper", {
    initialSlide: Math.max(0, Math.min(startIndex, photoList.length - 1)),
    loop: photoList.length > 1, // ✅ 2장 이상일 때만 loop
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    pagination: false // ✅ dot 제거
  });

  const updateCaption = () => {
    const i = swiperInstance.realIndex;
    const current = i + 1;
    const total = photoList.length;
    const photo = photoList[i];
    const date = escapeHtml(photo.DateTimeOriginal || photo.CreateDate || "");
    caption.innerHTML = `<div>(${current}/${total})</div><div>${date}</div>`;
  };

  swiperInstance.on("slideChange", updateCaption);
  updateCaption();
}

// 모달 닫기
document.getElementById("close-slideshow").addEventListener("click", () => {
  document.getElementById("slideshow-modal").style.display = "none";
});
document.getElementById("slideshow-modal").addEventListener("click", (e) => {
  if (e.target.id === "slideshow-modal") e.currentTarget.style.display = "none";
});

// ---------- 우측 목록 렌더 ----------
function buildPhotoList(arr) {
  const container = document.getElementById("photo-list");
  if (!container) return;
  container.innerHTML = "";

  // 최신순 정렬
  const sorted = [...arr].sort((a, b) => {
    const da = Date.parse(a.DateTimeOriginal || a.CreateDate || "") || 0;
    const db = Date.parse(b.DateTimeOriginal || b.CreateDate || "") || 0;
    return db - da;
  });

  // 타이틀에 개수 표기
  const titleEl = document.querySelector(".side-title");
  if (titleEl) titleEl.textContent = `해당 사진 목록 (${sorted.length}장)`;

  sorted.forEach((p, idx) => {
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
    // 목록 클릭 → 현재 화면 리스트 전체 + 클릭 인덱스로 슬라이드쇼
    item.addEventListener("click", () => openSlideshow(sorted, idx));
    container.appendChild(item);
  });
}

// ---------- 지도 범위 기준 리스트 갱신 ----------
const ZOOM_RESET_THRESHOLD = 5; // 이 이하 줌이면 전체 목록
let moveendTimer = null;

function refreshListByMapBounds() {
  const zoom = map.getZoom();
  if (zoom <= ZOOM_RESET_THRESHOLD) {
    currentList = [...data];
    buildPhotoList(currentList);
    return;
  }

  const bounds = map.getBounds();
  currentList = data.filter(p => {
    const lat = Number(p.GPSLatitude);
    const lng = Number(p.GPSLongitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && bounds.contains([lat, lng]);
  });

  buildPhotoList(currentList);
}

// 최초 1회 렌더
buildPhotoList(currentList);

// 지도 이동/확대 후 갱신 (디바운스)
map.on("moveend", () => {
  if (moveendTimer) cancelAnimationFrame(moveendTimer);
  moveendTimer = requestAnimationFrame(refreshListByMapBounds);
});

// ---------- 마커/클러스터 이벤트 ----------
markers.on("clusterclick", (ev) => {
  const arr = [];
  ev.layer.getAllChildMarkers().forEach(m => arr.push(m.photoData));

  // ✅ 우측 목록을 클러스터 집합으로 동기화
  currentList = arr;
  buildPhotoList(currentList);

  // 동일 집합으로 슬라이드쇼
  openSlideshow(arr, 0);
});

markers.on("click", (ev) => {
  // 단일 마커 클릭: 필요 시 우측 목록도 1장으로 동기화하려면 아래 두 줄 주석 해제
  // currentList = [ev.layer.photoData];
  // buildPhotoList(currentList);

  openSlideshow([ev.layer.photoData], 0);
});

// ---------- 유틸 ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}
