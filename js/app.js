// 지도 초기화 (몽골 울란바토르 중심)
const map = L.map("map").setView([47.9186, 106.9170], 12);

// 타일 레이어 (OpenStreetMap)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// 마커 클러스터 그룹
const markers = L.markerClusterGroup();

// 사진 데이터에서 마커 생성
photos.forEach(photo => {
  if (photo.GPSLatitude && photo.GPSLongitude) {
    const marker = L.marker([photo.GPSLatitude, photo.GPSLongitude]);
    marker.photoData = photo; // 마커에 사진 데이터 저장
    markers.addLayer(marker);
  }
});
map.addLayer(markers);

// 클러스터 클릭 이벤트 → 슬라이드쇼
markers.on("clusterclick", function (a) {
  const clusterPhotos = [];
  a.layer.getAllChildMarkers().forEach(m => {
    clusterPhotos.push(m.photoData);
  });
  openSlideshow(clusterPhotos);
});

// 개별 마커 클릭 이벤트 → 슬라이드쇼
markers.on("click", function (e) {
  openSlideshow([e.layer.photoData]);
});

// 슬라이드쇼 모달 열기
function openSlideshow(photoList) {
  const modal = document.getElementById("slideshow-modal");
  const wrapper = modal.querySelector(".swiper-wrapper");
  wrapper.innerHTML = ""; // 초기화

  photoList.forEach(p => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <img src="${p.SourceFile || p.file}" alt="${p.FileName}" />
      <p>${p.DateTimeOriginal || ""}</p>
    `;
    wrapper.appendChild(slide);
  });

  modal.style.display = "flex";

  // Swiper 새로 초기화
  new Swiper(".swiper", {
    loop: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
  });
}

// 모달 닫기
document.getElementById("close-slideshow").addEventListener("click", () => {
  document.getElementById("slideshow-modal").style.display = "none";
});
