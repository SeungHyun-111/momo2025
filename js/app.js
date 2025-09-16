// js/app.js

// 초기 화면: 몽골 중심, 넓게 보이도록 줌 레벨 6
const map = L.map("map").setView([46.5, 105.0], 6);

// 타일 레이어 (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// 마커 클러스터 그룹
// - zoomToBoundsOnClick:false  → 클러스터 클릭해도 자동 확대 금지
// - spiderfyOnClick:true       → 확대 대신 클러스터만 퍼뜨리기(원치 않으면 false)
const markers = L.markerClusterGroup({
  zoomToBoundsOnClick: false,
  spiderfyOnClick: true
});

// 사진 데이터에서 마커 생성 (photos: js/photos.js에서 로드됨)
photos.forEach(photo => {
  if (photo.GPSLatitude && photo.GPSLongitude) {
    const marker = L.marker([photo.GPSLatitude, photo.GPSLongitude]);
    marker.photoData = photo; // 슬라이드쇼용 데이터 보관
    markers.addLayer(marker);
  }
});
map.addLayer(markers);

// 클러스터 클릭 → 슬라이드쇼 (지도는 확대/이동하지 않음)
markers.on("clusterclick", (ev) => {
  const clusterPhotos = [];
  ev.layer.getAllChildMarkers().forEach(m => clusterPhotos.push(m.photoData));
  openSlideshow(clusterPhotos);
});

// 개별 마커 클릭 → 슬라이드쇼 (지도는 확대/이동하지 않음)
markers.on("click", (ev) => {
  openSlideshow([ev.layer.photoData]);
});

// 슬라이드쇼 모달 열기 (Swiper 초기화 포함)
function openSlideshow(photoList) {
  const modal = document.getElementById("slideshow-modal");
  const wrapper = modal.querySelector(".swiper-wrapper");
  wrapper.innerHTML = "";

  photoList.forEach(p => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";

    // 경로 우선순위: SourceFile > file > FileName 기반 추정
    const src = p.SourceFile || p.file || (p.FileName ? `image/converted/${p.FileName}` : "");
    slide.innerHTML = `
      <img src="${src}" alt="${p.FileName || ""}" />
      <p>${p.DateTimeOriginal || ""}</p>
    `;
    wrapper.appendChild(slide);
  });

  // 모달 표시 (초기 CSS는 display:none)
  modal.style.display = "flex";

  // 기존 인스턴스가 있다면 정리(옵션) — 간단히 매번 새로 생성
  new Swiper(".swiper", {
    loop: true,
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    pagination: { el: ".swiper-pagination", clickable: true }
  });
}

// 모달 닫기 (닫기 버튼)
document.getElementById("close-slideshow").addEventListener("click", () => {
  document.getElementById("slideshow-modal").style.display = "none";
});

// 모달 닫기 (오버레이 클릭 시)
document.getElementById("slideshow-modal").addEventListener("click", (e) => {
  if (e.target.id === "slideshow-modal") {
    e.currentTarget.style.display = "none";
  }
});
