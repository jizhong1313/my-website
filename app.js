'use strict';

const styles = Object.freeze({
  natural: { name: '原木风', image: './assets/room-natural.jpg' },
  modern: { name: '现代简约', image: './assets/room-modern.jpg' },
  cream: { name: '奶油风', image: './assets/room-cream.jpg' },
  wabi: { name: '侘寂风', image: './assets/room-wabi.jpg' },
});
const beforeImage = './assets/room-before.jpg';
const defaultSplit = 48;
const maxPhotoBytes = 20 * 1024 * 1024;
const byId = (id) => document.getElementById(id);

function setupComparison(container) {
  const range = container.querySelector('input[type="range"]');
  const after = container.querySelector('[data-after]');
  let active = null;

  function setSplit(value) {
    const split = Math.round(Math.max(0, Math.min(100, value)));
    range.value = split;
    range.setAttribute('aria-valuetext', '改造前 ' + split + '%，改造后 ' + (100 - split) + '%');
    container.style.setProperty('--position', split + '%');
    container.classList.toggle('is-mostly-after', split < 13);
    container.classList.toggle('is-mostly-before', split > 87);
  }

  function pointToSplit(event) {
    const { left, width } = range.getBoundingClientRect();
    if (width) setSplit(100 * (event.clientX - left) / width);
  }

  // Use the native range for keyboard and assistive technology, with a full-width
  // pointer target so the visual divider tracks the exact finger position.
  range.addEventListener('input', () => setSplit(range.valueAsNumber));
  range.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const touch = event.pointerType === 'touch';
    active = { id: event.pointerId, start: event.clientX, dragging: !touch };
    range.setPointerCapture(event.pointerId);
    if (!touch) {
      range.focus({ preventScroll: true });
      pointToSplit(event);
    }
  });
  range.addEventListener('pointermove', (event) => {
    if (!active || active.id !== event.pointerId) return;
    if (Math.abs(active.start - event.clientX) > 4) active.dragging = true;
    if (active.dragging) pointToSplit(event);
  });
  range.addEventListener('pointerup', (event) => {
    if (active?.id !== event.pointerId) return;
    pointToSplit(event);
    active = null;
  });
  range.addEventListener('lostpointercapture', () => { active = null; });
  range.addEventListener('pointercancel', () => { active = null; });
  setSplit(range.valueAsNumber);

  return {
    getSplit: () => range.valueAsNumber,
    setSplit,
    setStyle(styleKey) {
      const style = styles[styleKey];
      after.src = style.image;
      after.alt = style.name + '改造后的示例客厅';
    },
  };
}

const [mainCompare, dialogCompare] = Array.from(document.querySelectorAll('[data-compare]'), setupComparison);
const demoPills = Array.from(document.querySelectorAll('[data-demo-style]'));
const dialog = byId('scene-dialog');
let demoStyle = 'natural';

function selectDemoStyle(styleKey) {
  if (!Object.hasOwn(styles, styleKey)) return;
  demoStyle = styleKey;
  mainCompare.setStyle(styleKey);
  if (mainCompare.getSplit() > 82) mainCompare.setSplit(defaultSplit);
  for (const pill of demoPills) {
    pill.setAttribute('aria-pressed', String(pill.dataset.demoStyle === styleKey));
  }
  byId('demo-status').textContent = '已切换为' + styles[styleKey].name + '示例。';
}
for (const pill of demoPills) {
  pill.addEventListener('click', () => selectDemoStyle(pill.dataset.demoStyle));
}

function showScene(styleKey, split, fromStudio = false) {
  byId('dialog-title').textContent = styles[styleKey].name + ' · 示例客厅';
  byId('dialog-note').textContent = fromStudio
    ? '这里展示的是该风格的示例客厅。你的房间照片仍保留在工作台。'
    : '拖动中间滑杆，查看这个示例客厅的前后差异。';
  dialog.querySelector('[data-dialog-before]').src = beforeImage;
  dialogCompare.setStyle(styleKey);
  dialogCompare.setSplit(split);
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    selectDemoStyle(styleKey);
    document.querySelector('#demo').scrollIntoView();
  }
}

byId('expand-demo').addEventListener('click', () => showScene(demoStyle, mainCompare.getSplit()));
byId('preview-style').addEventListener('click', () => {
  const styleKey = document.querySelector('input[name="room-style"]:checked').value;
  showScene(styleKey, defaultSplit, Boolean(photo.file));
});
byId('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    dialog.close();
  }
});

const photo = { file: null, url: null, request: 0 };
const dropZone = byId('drop-zone');
const gallery = byId('gallery-input');
const camera = byId('camera-input');
const choosePhoto = byId('choose-photo');
const takePhoto = byId('take-photo');
const replacePhoto = byId('replace-photo');
const removePhoto = byId('remove-photo');
const preview = byId('photo-preview');
const uploadError = byId('upload-error');
const uploadStatus = byId('upload-status');

function showError(message = '') {
  uploadError.textContent = message;
  uploadError.hidden = !message;
}

function releasePhoto() {
  if (photo.url) URL.revokeObjectURL(photo.url);
  photo.file = null;
  photo.url = null;
}

async function readPhoto(file) {
  const request = ++photo.request;
  showError();
  uploadStatus.textContent = '';
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp)$/i.test(file.name)) {
    showError('请选择房间照片，例如 JPG、PNG 或 WebP。');
    return;
  }
  if (file.size > maxPhotoBytes) {
    showError('这张照片超过了 20 MB，请换一张较小的照片。');
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    if (request === photo.request) {
      showError('这张照片无法打开，请试试 JPG、PNG 或 WebP 格式。');
    }
    return;
  }

  if (request !== photo.request) {
    URL.revokeObjectURL(url);
    return;
  }
  const restoreFocus = [choosePhoto, takePhoto].includes(document.activeElement);
  releasePhoto();
  photo.file = file;
  photo.url = url;
  preview.src = url;
  byId('photo-name').textContent = file.name;
  byId('photo-name').title = file.name;
  byId('upload-empty').hidden = true;
  byId('upload-filled').hidden = false;
  uploadStatus.textContent = '已添加照片：' + file.name;
  if (restoreFocus) replacePhoto.focus();
}

function attachPhotoInput(input, button) {
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    input.value = '';
    if (file) void readPhoto(file);
  });
}
attachPhotoInput(gallery, choosePhoto);
attachPhotoInput(camera, takePhoto);
replacePhoto.addEventListener('click', () => gallery.click());
removePhoto.addEventListener('click', () => {
  ++photo.request;
  releasePhoto();
  preview.removeAttribute('src');
  byId('upload-filled').hidden = true;
  byId('upload-empty').hidden = false;
  showError();
  uploadStatus.textContent = '照片已移除。';
  choosePhoto.focus();
});

function carriesFile(event) {
  return event.dataTransfer?.types.includes('Files');
}
window.addEventListener('dragover', (event) => {
  if (carriesFile(event)) event.preventDefault();
});
window.addEventListener('drop', (event) => {
  if (carriesFile(event)) event.preventDefault();
});
dropZone.addEventListener('dragover', (event) => {
  if (!carriesFile(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dropZone.classList.add('is-dragging');
});
dropZone.addEventListener('dragleave', (event) => {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragging');
});
dropZone.addEventListener('drop', (event) => {
  if (!carriesFile(event)) return;
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
  const [file] = event.dataTransfer.files;
  if (event.dataTransfer.files.length > 1) {
    showError('每次请添加一张房间照片。');
  } else if (file) {
    void readPhoto(file);
  }
});
