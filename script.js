const photobooth = document.getElementById("photobooth");
const bgImage = document.getElementById("bgImage");
const windowFrame = document.getElementById("windowFrame");
const stickerPanelBg = document.getElementById("stickerPanelBg");

const cameraStage = document.getElementById("cameraStage");
const video = document.getElementById("video");
const capturedPhoto = document.getElementById("capturedPhoto");
const countdown = document.getElementById("countdown");
const stickerLayer = document.getElementById("stickerLayer");

const startCameraButton = document.getElementById("startCameraButton");
const captureButton = document.getElementById("captureButton");
const retakeButton = document.getElementById("retakeButton");
const saveButton = document.getElementById("saveButton");
const stickerButtons = document.querySelectorAll(".sticker-btn");

let stream = null;
let capturedDataUrl = "";

/* 스티커 이미지 캐시 */
const stickerCache = new Map();

/* ===== 기준 좌표 (CSS와 동일해야 함) ===== */
const BASE_WIDTH = 576;
const BASE_HEIGHT = 1024;

const STAGE_X = 130;
const STAGE_Y = 80;
const STAGE_W = 415;
const STAGE_H = 333;

const FRAME_X = 85;
const FRAME_Y = 20;
const FRAME_W = 491;
const FRAME_H = 508;

/* 현재 CSS 기준으로 수정 */
const PANEL_X = 50;
const PANEL_Y = 745;
const PANEL_W = 411;
const PANEL_H = 184;

const STICKER_GRID_X = 95;
const STICKER_GRID_Y = 795;
const STICKER_GRID_W = 326;
const STICKER_GRID_H = 112;

/* ---------------------------
   카메라 켜기
--------------------------- */
async function setupCamera() {
  try {
    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      await video.play();
      return;
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();
  } catch (error) {
    console.error("카메라 실행 실패:", error);
    alert("카메라 권한 허용이 필요합니다.");
  }
}

/* ---------------------------
   카운트다운
--------------------------- */
function runCountdown(seconds = 3) {
  return new Promise((resolve) => {
    let current = seconds;
    countdown.style.display = "flex";
    countdown.textContent = current;

    const timer = setInterval(() => {
      current -= 1;

      if (current > 0) {
        countdown.textContent = current;
      } else {
        clearInterval(timer);
        countdown.style.display = "none";
        resolve();
      }
    }, 1000);
  });
}

/* ---------------------------
   사진 촬영
--------------------------- */
function captureFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    alert("카메라가 아직 준비되지 않았습니다.");
    return;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = STAGE_W;
  canvas.height = STAGE_H;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const videoRatio = vw / vh;
  const stageRatio = STAGE_W / STAGE_H;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > stageRatio) {
    sw = vh * stageRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / stageRatio;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  ctx.translate(STAGE_W, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, STAGE_W, STAGE_H);
  ctx.restore();

  capturedDataUrl = canvas.toDataURL("image/png");
  capturedPhoto.src = capturedDataUrl;
  capturedPhoto.style.display = "block";
  video.style.display = "none";
}

async function startCapture() {
  await setupCamera();

  if (!video.videoWidth) {
    alert("카메라 로딩 중입니다. 잠시 후 다시 눌러주세요.");
    return;
  }

  await runCountdown(3);
  captureFrame();
}

/* ---------------------------
   다시 찍기
--------------------------- */
function retakePhoto() {
  capturedDataUrl = "";
  capturedPhoto.src = "";
  capturedPhoto.style.display = "none";
  video.style.display = "block";

  if (video.srcObject) {
    video.play().catch((error) => {
      console.error("비디오 재생 실패:", error);
    });
  }

  stickerLayer.innerHTML = "";
}

/* ---------------------------
   스티커 추가
--------------------------- */
function addSticker(src) {
  const item = document.createElement("div");
  item.className = "sticker-item";
  item.dataset.src = src;

  const img = document.createElement("img");
  img.src = src;
  item.appendChild(img);

  const stickerSize = 52;
  item.style.left = `${cameraStage.clientWidth / 2 - stickerSize / 2}px`;
  item.style.top = `${cameraStage.clientHeight / 2 - stickerSize / 2}px`;

  const rotate = Math.floor(Math.random() * 20 - 10);
  item.dataset.rotate = String(rotate);
  item.style.transform = `rotate(${rotate}deg)`;

  stickerLayer.appendChild(item);
  makeDraggable(item);

  if (!stickerCache.has(src)) {
    const preload = new Image();
    preload.src = src;
    stickerCache.set(src, preload);
  }
}

/* ---------------------------
   스티커 드래그
--------------------------- */
function makeDraggable(target) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  target.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    target.setPointerCapture(pointerId);

    startX = event.clientX;
    startY = event.clientY;
    startLeft = parseFloat(target.style.left || "0");
    startTop = parseFloat(target.style.top || "0");

    target.style.zIndex = String(Date.now());
  });

  target.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    let nextLeft = startLeft + dx;
    let nextTop = startTop + dy;

    const maxLeft = cameraStage.clientWidth - target.offsetWidth;
    const maxTop = cameraStage.clientHeight - target.offsetHeight;

    nextLeft = Math.max(0, Math.min(nextLeft, maxLeft));
    nextTop = Math.max(0, Math.min(nextTop, maxTop));

    target.style.left = `${nextLeft}px`;
    target.style.top = `${nextTop}px`;
  });

  target.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;
    target.releasePointerCapture(pointerId);
    pointerId = null;
  });

  target.addEventListener("dblclick", () => {
    target.remove();
  });
}

/* ---------------------------
   이미지 로드 대기
--------------------------- */
function waitForImage(imageElement) {
  return new Promise((resolve) => {
    if (imageElement.complete) {
      resolve();
      return;
    }

    imageElement.onload = () => resolve();
    imageElement.onerror = () => resolve();
  });
}

/* ---------------------------
   비디오를 cover 방식으로 캔버스에 그림
--------------------------- */
function drawVideoCover(ctx, videoEl, dx, dy, dw, dh) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  const videoRatio = vw / vh;
  const targetRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  ctx.translate(dx + dw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, dw, dh);
  ctx.restore();
}

/* ---------------------------
   하단 스티커 패널 아이콘 직접 그리기
--------------------------- */
async function drawStickerPanelIcons(ctx, gridX, gridY, gridW, gridH) {
  const cols = 5;
  const rows = 2;
  const cellW = gridW / cols;
  const cellH = gridH / rows;
  const iconSize = 32;

  for (let i = 0; i < 10; i++) {
    const src = `assets/${i + 1}.png`;

    let img = stickerCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      stickerCache.set(src, img);
    }

    await waitForImage(img);

    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = gridX + col * cellW + (cellW - iconSize) / 2;
    const y = gridY + row * cellH + (cellH - iconSize) / 2;

    ctx.drawImage(img, x, y, iconSize, iconSize);
  }
}

/* ---------------------------
   저장
--------------------------- */
async function saveCompositeImage() {
  const exportCanvas = document.createElement("canvas");
  const ctx = exportCanvas.getContext("2d");

  exportCanvas.width = BASE_WIDTH;
  exportCanvas.height = BASE_HEIGHT;

  await Promise.all([
    waitForImage(bgImage),
    waitForImage(windowFrame),
    waitForImage(stickerPanelBg)
  ]);

  ctx.drawImage(bgImage, 0, 0, BASE_WIDTH, BASE_HEIGHT);

  if (capturedDataUrl) {
    const tempPhoto = new Image();
    tempPhoto.src = capturedDataUrl;
    await waitForImage(tempPhoto);
    ctx.drawImage(tempPhoto, STAGE_X, STAGE_Y, STAGE_W, STAGE_H);
  } else if (video.videoWidth) {
    drawVideoCover(ctx, video, STAGE_X, STAGE_Y, STAGE_W, STAGE_H);
  }

  const stickerItems = [...stickerLayer.querySelectorAll(".sticker-item")];
  const stageRect = cameraStage.getBoundingClientRect();

  for (const sticker of stickerItems) {
    const src = sticker.dataset.src;
    let img = stickerCache.get(src);

    if (!img) {
      img = new Image();
      img.src = src;
      stickerCache.set(src, img);
    }

    await waitForImage(img);

    const rotate = Number(sticker.dataset.rotate || 0);

    const stickerRect = sticker.getBoundingClientRect();

    const x = STAGE_X + ((stickerRect.left - stageRect.left) / stageRect.width) * STAGE_W;
    const y = STAGE_Y + ((stickerRect.top - stageRect.top) / stageRect.height) * STAGE_H;
    const w = (stickerRect.width / stageRect.width) * STAGE_W;
    const h = (stickerRect.height / stageRect.height) * STAGE_H;
    
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  ctx.drawImage(windowFrame, FRAME_X, FRAME_Y, FRAME_W, FRAME_H);
  ctx.drawImage(stickerPanelBg, PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  await drawStickerPanelIcons(
    ctx,
    STICKER_GRID_X,
    STICKER_GRID_Y,
    STICKER_GRID_W,
    STICKER_GRID_H
  );

  const link = document.createElement("a");
  link.href = exportCanvas.toDataURL("image/png");
  link.download = "xp-photobooth.png";
  link.click();
}

/* ---------------------------
   이벤트 연결
--------------------------- */
startCameraButton.addEventListener("click", setupCamera);
captureButton.addEventListener("click", startCapture);
retakeButton.addEventListener("click", retakePhoto);
saveButton.addEventListener("click", saveCompositeImage);

stickerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    addSticker(button.dataset.src);
  });
});
