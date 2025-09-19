/* photos.js 구조 대응:
   - 전역 배열: const photos = [...];
   - 필드명: SourceFile, DateTimeOriginal, Group(=한글 그룹명)
*/
(() => {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
  const getParam = (k) => new URLSearchParams(location.search).get(k);

  let DATA = [];
  try { if (Array.isArray(photos)) DATA = photos; } catch(e) {}
  if (!DATA.length && Array.isArray(window.photos)) DATA = window.photos;
  if (!DATA.length && Array.isArray(window.PHOTOS)) DATA = window.PHOTOS;

  const resolveSrc     = (p) => p.SourceFile || p.src || p.url || p.path || null;
  const resolveTakenAt = (p) => p.DateTimeOriginal || p.taken_at || p.datetime || '';
  const resolveGroupKO = (p) => p.Group || p.group || '';

  const strip       = qs('#thumbStrip');
  const figure      = qs('#figure');
  const mainImg     = qs('#main');
  const placeholder = qs('#placeholder');
  const counter     = qs('#counter');
  const ts          = qs('#timestamp');
  const layout      = qs('#layout');
  const btnPrev     = qs('#btnPrev');
  const btnNext     = qs('#btnNext');
  const groupLabel  = qs('#group-label');
  const groupDescEl = qs('#group-desc');
  const toggleBtn   = qs('#toggleStripPos');

  const slug = (getParam('group') || '').trim();
  let list = [];
  let currentIndex = -1;

  // 슬러그 → 한글 그룹명
  const SLUG_TO_KO = {
    'night-sky':'밤하늘',
    'terelj':'테를지 국립공원',
    'horse':'말',
    'chinggis-museum':'칭기스칸 박물관',
    'horse-show':'마상쇼',
    'elshaltaat-temple':'엘살타하르 사원',
    'furgon':'푸르공',
    'mini-desert':'미니사막',
    'camel':'낙타',
    'karakorum':'카라코룸',
    'ulaanbaatar':'울란바토르',
    'ulanbator':'울란바토르',
    'airport':'공항'
  };

  // 그룹별 짧은 설명
  const GROUP_DESC = {
    '밤하늘':'사막 한가운데에서 올려다본 별의 바다',
    '테를지국립공원':'자연이 살아 숨 쉬는 몽골의 초원과 암석지대',
    '말':'광활한 초원을 달리는 말들과의 만남',
    '칭기스칸박물관':'몽골의 역사와 문화가 모인 공간',
    '마상쇼':'기마 전통 공연의 박진감',
    '엘살타하르사원':'고즈넉함 속 특별했던 순간',
    '푸르공':'광야를 누빈 러시아 밴과의 여정',
    '미니사막':'아담하지만 인상적인 사구 풍경',
    '낙타':'끝없는 사막 위 고요한 동행',
    '카라코룸':'옛 수도의 흔적을 따라',
    '울란바토르':'도시의 하루와 가족의 기록',
    '공항':'여정의 시작과 끝'
  };

  function setHeader(koName){
    groupLabel.textContent = koName ? `· ${koName}` : '';
    groupDescEl.textContent = GROUP_DESC[koName] || '';
  }

  function init(){
    if (!Array.isArray(DATA)) {
      strip.innerHTML = `<div style="color:#ccc;padding:10px;">photos.js의 <b>photos</b> 배열을 찾을 수 없습니다.</div>`;
      return;
    }
    if (!slug){
      strip.innerHTML = `<div style="color:#ccc;padding:10px;">그룹이 지정되지 않았습니다. 예) viewer.html?group=camel</div>`;
      return;
    }

    const koName = SLUG_TO_KO[slug] || slug;
    setHeader(koName);

    list = DATA.filter(p => String(resolveGroupKO(p)).trim() === koName)
               .map((p,i)=>({...p,_index:i}))
               .filter(p => !!resolveSrc(p));

    if(!list.length){
      strip.innerHTML = `<div style="color:#ccc;padding:10px;">해당 그룹의 사진이 없습니다: <b>${koName}</b></div>`;
      return;
    }

    renderStrip(list);
    currentIndex = -1;      // 초기 선택 없음
    updateNavButtons();
  }

  function renderStrip(items){
    const frag = document.createDocumentFragment();
    items.forEach((item,i)=>{
      const el = document.createElement('button');
      el.className = 'thumb';
      el.type = 'button';
      el.dataset.idx = String(i);
      el.setAttribute('aria-label', `사진 ${i+1}`);

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = resolveSrc(item);
      img.alt = item.FileName || '';

      el.appendChild(img);
      el.addEventListener('click', ()=>openAt(i,true));
      frag.appendChild(el);
    });
    strip.innerHTML = '';
    strip.appendChild(frag);
  }

  function openAt(idx, fromClick=false){
    if (idx<0 || idx>=list.length) return;

    const item = list[idx];
    const src = resolveSrc(item);
    const takenAt = resolveTakenAt(item);

    qsa('.thumb', strip).forEach(th => th.classList.toggle('active', Number(th.dataset.idx)===idx));

    placeholder.style.display = 'none';
    figure.style.display = 'block';

    mainImg.style.opacity = '0';
    mainImg.onload = () => {
      mainImg.style.opacity = '1';
      adjustStripPlacement();          // 세로 사진 보정 로직
      if (fromClick) centerThumbIntoView(idx);
    };
    mainImg.src = src;
    mainImg.alt = item.FileName || '';

    counter.textContent = `${idx+1} / ${list.length}`;
    ts.textContent = takenAt || '';

    currentIndex = idx;
    updateNavButtons();
  }

  function centerThumbIntoView(idx){
    const thumb = qs(`.thumb[data-idx="${idx}"]`, strip);
    if(!thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth/2 - thumb.clientWidth/2);
    strip.scrollTo({left, behavior:'smooth'});
  }

  function prev(){ if(currentIndex>0) openAt(currentIndex-1); }
  function next(){ if(currentIndex<list.length-1) openAt(currentIndex+1); }

  function updateNavButtons(){
    const on = currentIndex>=0;
    btnPrev.style.display = on ? '' : 'none';
    btnNext.style.display = on ? '' : 'none';
  }

  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  document.addEventListener('keydown', (e)=>{
    if (e.key==='Escape') location.href='index.html';
    if (e.key==='ArrowLeft'  && currentIndex>=0) prev();
    if (e.key==='ArrowRight' && currentIndex>=0) next();
  });

  // === 썸네일 위치 토글(상/하) ===
  toggleBtn.addEventListener('click', ()=>{
    layout.classList.toggle('strip-top');
  });

  // === 세로 사진 자동 보정 ===
  // 조건 강화:
  //  1) 이미지 종횡비 aspect < 0.82 (꽤 세로)
  //  2) 뷰포트 높이 <= 900 (작은 화면)
  //  3) 렌더된 이미지 높이가 사용 가능 높이의 88% 이상을 먹는 경우
  function adjustStripPlacement(){
    if (!mainImg.complete || !mainImg.naturalWidth) return;

    const aspect = mainImg.naturalWidth / mainImg.naturalHeight;
    const viewportH = window.innerHeight;
    const thumbH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--thumb-h'),10) || 120;

    // 현재 이미지가 차지할 수 있는 최대 높이 추산
    const reserved = 200; // 헤더/여백/캡션 여유값
    const usable = Math.max(200, viewportH - thumbH - reserved);

    const renderedH = mainImg.clientHeight || mainImg.naturalHeight;
    const filledRatio = renderedH / usable;

    const shouldTop = (aspect < 0.82) && (viewportH <= 900) && (filledRatio > 0.88);
    layout.classList.toggle('strip-top', shouldTop);
  }
  window.addEventListener('resize', adjustStripPlacement);

  init();
})();
