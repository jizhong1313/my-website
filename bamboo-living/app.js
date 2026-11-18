'use strict';
const $ = (id) => document.getElementById(id);
const byProduct = new Map(BAMBOO_CATALOG.map((product) => [product.id, product]));
const groupNames = { seat: '坐具', screen: '屏风', storage: '收纳', lamp: '竹灯', art: '陈设', tea: '茶道与香具', study: '文房' };
const areaAdvice = {
  corner: '小角落优先考虑桌面或墙面竹器，尺寸由店铺和你一起核对。',
  zone: '建议量出可用宽度、深度与通行范围，再选具体款式。',
  whole: '先决定家具位置，再安排外围的屏风、收纳与照明。',
};
const purposeGroups = { balanced: [], sit: ['seat'], divide: ['screen'], store: ['storage'], light: ['lamp'] };
const roomGroups = {
  tea: ['screen','seat','storage','lamp','art','tea'],
  living: ['seat','screen','art','lamp','storage'],
  entry: ['screen','art','storage','lamp','seat'],
  study: ['study','lamp','art','storage','screen','seat','tea'],
};
const productStep = 9;
const result = $('result');
const form = $('studio-form');
const selected = new Set();
const state = { scene: 'tea', filter: 'all', query: '', limit: productStep, photo: null, photoJob: 0, plan: null, exportSeq: 0, file: null, downloadUrl: null, timer: null };
const candidates = () => [...selected];
const selection = () => ({
  room: form.elements.room.value,
  area: $('area').value,
  purpose: $('purpose').value,
  areaLabel: $('area').selectedOptions[0].text,
  purposeLabel: $('purpose').selectedOptions[0].text,
  notes: $('notes').value.trim(),
});

function el(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text) element.textContent = text;
  return element;
}
function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#icon-' + name);
  svg.append(use);
  return svg;
}
function press(pills, key, value) {
  for (const button of pills) button.setAttribute('aria-pressed', String(button.dataset[key] === value));
}

const sceneButtons = [...document.querySelectorAll('[data-scene]')];
function listing(href, label, className) {
  const link = el('a', className, label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
function showScene(id, announce = true) {
  const scene = BAMBOO_SCENES[id];
  const lead = byProduct.get(scene.lead);
  state.scene = id;
  press(sceneButtons, 'scene', id);
  $('scene-image').src = lead.image;
  $('scene-image').alt = '竹禅迹淘宝店的' + lead.name + '原图';
  $('scene-listing').href = lead.url;
  $('scene-listing').querySelector('span').textContent = lead.name + ' · 店铺原图';
  $('scene-kicker').replaceChildren(scene.index + ' / 04', el('span'), scene.room);
  $('scene-name').textContent = scene.title;
  $('scene-description').textContent = scene.description;
  $('scene-items').replaceChildren(...scene.items.map((key) => {
    const item = byProduct.get(key);
    const li = el('li');
    li.append(listing(item.url, item.name, 'scene-product-link'));
    return li;
  }));
  if (announce) $('scene-status').textContent = '已切换到' + scene.title + '。';
}
for (const button of sceneButtons) button.addEventListener('click', () => showScene(button.dataset.scene));
$('use-scene').addEventListener('click', () => {
  form.elements.room.value = state.scene;
  if (state.plan) showPlan();
});
showScene('tea', false);

const filters = [...document.querySelectorAll('[data-filter]')];
function updateCardButton(button) {
  const product = byProduct.get(button.dataset.product);
  const on = selected.has(product.id);
  button.setAttribute('aria-pressed', String(on));
  button.setAttribute('aria-label', product.name + (on ? '，已加入搭配，点击移除' : '，加入搭配'));
  button.replaceChildren(icon(on ? 'check' : 'plus'), on ? '已加入' : '加入搭配');
}
function productCard(product) {
  const card = el('article', 'product');
  card.dataset.item = product.id;
  const media = listing(product.url, '', 'product-media');
  media.setAttribute('aria-label', '在淘宝查看' + product.name);
  const photo = el('img');
  photo.src = product.image;
  photo.alt = product.name + '的竹禅迹店铺原图';
  photo.width = product.width;
  photo.height = product.height;
  photo.loading = 'lazy';
  photo.decoding = 'async';
  media.append(photo);
  const body = el('div', 'product-body');
  const add = el('button', 'product-add');
  add.type = 'button';
  add.dataset.product = product.id;
  updateCardButton(add);
  add.addEventListener('click', () => togglePick(product.id));
  const source = el('p', 'product-description', product.caption);
  source.title = product.title;
  const actions = el('div', 'product-actions');
  const details = listing(product.url, '淘宝详情', 'product-details');
  details.setAttribute('aria-label', product.name + '的淘宝详情');
  details.append(icon('diagonal'));
  actions.append(add, details);
  body.append(el('p', 'product-category', groupNames[product.group]), el('h3', '', product.name), source, actions);
  card.append(media, body);
  return card;
}
function renderProducts({announce = false, append = false} = {}) {
  const filtersMatch = (p) => state.filter === 'all' || p.group === state.filter;
  const queryMatch = (p) => !state.query || (p.name + ' ' + p.title + ' ' + groupNames[p.group]).includes(state.query);
  const visible = BAMBOO_CATALOG.filter((p) => filtersMatch(p) && queryMatch(p));
  press(filters, 'filter', state.filter);
  const grid = $('product-grid');
  const count = Math.min(visible.length, state.limit);
  const firstNew = append ? grid.childElementCount : 0;
  const cards = visible.slice(firstNew, count).map(productCard);
  if (append) grid.append(...cards);
  else grid.replaceChildren(...cards);
  if (!count) grid.append(el('p', 'catalog-empty', '没有找到匹配的竹器，可以换个词或品类。'));
  $('catalog-count').textContent = count ? '已显示 ' + count + ' / ' + visible.length + ' 件作品' : '找到 0 件作品';
  $('catalog-more').hidden = count === visible.length;
  if (count < visible.length) $('catalog-more').textContent = '再看 ' + Math.min(visible.length - count, productStep) + ' 件';
  if (append && cards.length) cards[0].querySelector('a').focus({preventScroll: true});
  if (announce) $('catalog-status').textContent = $('catalog-count').textContent;
}
function showPicks() {
  $('saved-total').textContent = selected.size;
  for (const button of document.querySelectorAll('button[data-product]')) updateCardButton(button);
  $('studio-picks').hidden = !selected.size;
  $('studio-picks-list').replaceChildren(...candidates().map((id) => {
    const product = byProduct.get(id);
    const button = el('button', '', product.name);
    button.type = 'button';
    button.setAttribute('aria-label', '从搭配中移除' + product.name);
    button.append(icon('close'));
    button.addEventListener('click', () => {
      togglePick(id);
      const next = $('studio-picks-list').querySelector('button') || $('notes');
      next.focus();
    });
    return button;
  }));
}
function togglePick(id) {
  const on = !selected.has(id);
  if (on) selected.add(id);
  else selected.delete(id);
  $('catalog-status').textContent = (on ? '已加入' : '已移除') + byProduct.get(id).name + '。';
  showPicks();
  if (state.plan) showPlan();
}
for (const button of filters) button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  state.limit = productStep;
  renderProducts({announce: true});
});
$('catalog-search').addEventListener('input', (event) => {
  state.query = event.target.value.trim();
  state.limit = productStep;
  renderProducts({announce: true});
});
$('catalog-more').addEventListener('click', () => {
  state.limit += productStep;
  renderProducts({announce: true, append: true});
});
renderProducts();

const photoError = $('photo-error');
const photoPreview = $('photo-preview');
const photoEmpty = $('photo-empty');
const photoFilled = $('photo-filled');
const dropZone = $('drop-zone');
const fileInputs = [$('pick-input'), $('take-input')];
const photoTriggers = [$('pick-photo'), $('take-photo')];
function photoIssue(message = '') {
  photoError.textContent = message;
  photoError.hidden = !message;
  if (message) photoError.scrollIntoView({ block: 'nearest' });
}
function releasePhoto() {
  if (state.photo?.owned) URL.revokeObjectURL(state.photo.src);
  state.photo = null;
}
function installPhoto(photo) {
  const restoreFocus = photoTriggers.includes(document.activeElement);
  releasePhoto();
  state.photo = photo;
  photoPreview.src = photo.src;
  photoPreview.alt = '你选择的房间照片';
  $('photo-filename').textContent = photo.name;
  $('photo-filename').title = photo.name;
  photoEmpty.hidden = true;
  photoFilled.hidden = false;
  photoIssue();
  $('photo-status').textContent = '已添加房间照片。';
  if (restoreFocus) $('replace-photo').focus({ preventScroll: true });
  if (state.plan) showPlan();
}
function loadPicture(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}
async function readFile(file) {
  const job = ++state.photoJob;
  photoIssue();
  if (!file.type.startsWith('image/') && !(file.type === '' && /\.(jpe?g|png|avif|heic|heif|webp|gif)$/i.test(file.name))) {
    photoIssue('请选择一张图片，例如 JPG、PNG 或 WebP。');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    photoIssue('照片超过 20 MB，请换一张较小的图片。');
    return;
  }
  const src = URL.createObjectURL(file);
  try {
    const image = await loadPicture(src);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Empty image');
    if (job === state.photoJob) {
      installPhoto({ src, name: file.name, owned: true });
      return;
    }
  } catch {
    if (job === state.photoJob) photoIssue('打不开这张图片，请换成 JPG、PNG 或 WebP 再试。');
  }
  URL.revokeObjectURL(src);
}
for (const [index, input] of fileInputs.entries()) {
  photoTriggers[index].addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    input.value = '';
    if (file) void readFile(file);
  });
}
$('replace-photo').addEventListener('click', () => fileInputs[0].click());
$('remove-photo').addEventListener('click', () => {
  state.photoJob++;
  releasePhoto();
  photoPreview.removeAttribute('src');
  $('result-photo').removeAttribute('src');
  photoFilled.hidden = true;
  photoEmpty.hidden = false;
  state.plan = null;
  result.hidden = true;
  clearExport();
  photoIssue();
  $('photo-status').textContent = '已移除房间照片。';
  $('pick-photo').focus({ preventScroll: true });
});
function isFileDrop(event) { return event.dataTransfer?.types.includes('Files'); }
window.addEventListener('dragover', (event) => { if (isFileDrop(event)) event.preventDefault(); });
window.addEventListener('drop', (event) => { if (isFileDrop(event)) event.preventDefault(); });
dropZone.addEventListener('dragover', (event) => {
  if (!isFileDrop(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  dropZone.classList.add('is-dragging');
});
dropZone.addEventListener('dragleave', (event) => {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragging');
});
dropZone.addEventListener('drop', (event) => {
  if (!isFileDrop(event)) return;
  event.preventDefault();
  dropZone.classList.remove('is-dragging');
  if (event.dataTransfer.files.length !== 1) photoIssue('每次请添加一张房间照片。');
  else void readFile(event.dataTransfer.files[0]);
});

function placement(product, plan) {
  if (product.place === 'divider') return plan.room === 'entry'
    ? '先看门扇和通行范围，再核对屏风展开宽度与稳固方式。'
    : '可放在区域外侧分隔视线，先核对展开范围和通行宽度。';
  if (product.group === 'seat') return '先量椅子摆放区域，留足起身空间。尺寸与可选款式见淘宝详情。';
  if (product.group === 'lamp') return '先找一处稳定台面，并向店铺确认电源方式和摆放尺寸。';
  if (product.place === 'wall') return '先选留有空白的墙面，再核对作品尺寸、重量与安装方式。';
  if (product.group === 'screen') return '可在桌面靠后布置，留出手边空间，确认款式和展开尺寸。';
  if (product.group === 'storage' && product.place === 'floor') return '贴墙摆放前先量深度和宽度，并向店铺确认稳固方式。';
  if (product.group === 'storage' || product.group === 'study') return '放在桌面或搁板顺手的位置，按常用物件大小核对尺寸。';
  if (product.group === 'tea') return '在茶席或案头留出取用空间，具体用途和使用方式请看商品详情。';
  return '可以考虑案几或搁板上的留白处，先按商品详情核对尺寸。';
}
function composePlan() {
  const input = selection();
  const scene = BAMBOO_SCENES[input.room];
  const eligible = (p) => roomGroups[input.room].includes(p.group) &&
    (input.area !== 'corner' || p.place === 'wall' || p.place === 'table');
  const defaultOrder = [...new Set([...scene.order, ...BAMBOO_CATALOG.map((p) => p.id)])];
  const ordered = defaultOrder.map((id) => byProduct.get(id)).filter(eligible);
  const likes = candidates().map((id) => byProduct.get(id)).filter(eligible);
  const preferred = purposeGroups[input.purpose];
  const prefer = (p) => preferred.includes(p.group) && (input.purpose !== 'divide' || p.place === 'divider');
  const target = likes.find(prefer) || ordered.find(prefer);
  const priority = [...(target ? [target] : []), ...likes];
  const count = input.area === 'corner' ? 2 : input.area === 'zone' ? 3 : 4;
  const picked = [...new Set(priority)].slice(0, count);
  for (const p of ordered) {
    if (picked.length === count) break;
    if (!picked.some((x) => x.group === p.group)) picked.push(p);
  }
  for (const p of ordered) {
    if (picked.length === count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  const deferred = candidates().filter((id) => !picked.some((p) => p.id === id)).map((id) => byProduct.get(id).name);
  const noMatch = preferred.length && !target;
  return {
    ...input, scene, photo: state.photo, lead: picked[0], products: picked,
    header: scene.room + ' · ' + input.areaLabel + ' · ' + input.purposeLabel,
    context: scene.context + areaAdvice[input.area],
    deferred: (deferred.length ? '心仪的「' + deferred.join('、') + '」可以带到店铺，再核对尺寸和位置。' : '') +
      (noMatch ? '当前范围下先推荐桌面或墙面竹器；如果需要落地家具，可请店铺按可用尺寸筛选。' : ''),
  };
}
function showPlan(scroll = false) {
  if (!state.photo) return;
  const plan = composePlan();
  state.plan = plan;
  $('result-title').textContent = plan.scene.room + '的竹居搭配';
  $('result-meta').textContent = plan.header;
  $('result-photo').src = plan.photo.src;
  $('result-photo').alt = '你的房间实拍';
  $('result-reference').src = plan.lead.image;
  $('result-reference').alt = '竹禅迹淘宝店的' + plan.lead.name + '原图';
  $('result-origin').textContent = '你的实拍';
  $('result-source').textContent = '店铺原图 · ' + plan.lead.name;
  $('result-context').textContent = plan.context;
  $('result-list').replaceChildren(...plan.products.map((product, index) => {
    const li = el('li');
    const link = listing(product.url, product.name, 'result-product');
    link.append(icon('diagonal'));
    li.append(el('span', 'result-count', String(index + 1).padStart(2, '0')), link, el('p', '', placement(product, plan)));
    return li;
  }));
  $('result-list').classList.toggle('result-list--four', plan.products.length === 4);
  $('result-deferred').hidden = !plan.deferred;
  $('result-deferred').textContent = plan.deferred;
  result.hidden = false;
  queueExport(plan);
  if (scroll) {
    result.scrollIntoView({ block: 'start' });
    $('result-title').focus({ preventScroll: true });
  }
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.photo) {
    photoIssue('请先拍照或从相册选择房间照片。');
    $('take-photo').focus({ preventScroll: true });
    return;
  }
  showPlan(true);
});
form.addEventListener('change', (event) => {
  if (state.plan && (event.target.matches('select') || event.target.name === 'room')) showPlan();
});
$('notes').addEventListener('input', () => {
  if (state.plan) showPlan();
});

const font = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
function lines(ctx, str, width) {
  const output = [];
  for (const paragraph of str.split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width) {
        output.push(line);
        line = '';
      }
      line += char;
    }
    output.push(line);
  }
  return output;
}
function drawLines(ctx, str, x, y, width, step, limit = 9) {
  const all = lines(ctx, str, width);
  for (const [index, line] of all.slice(0, limit).entries()) {
    ctx.fillText(line + (index === limit - 1 && all.length > limit ? '…' : ''), x, y + step * index);
  }
}
function drawFit(ctx, image, dx, dy, dw, dh, cover) {
  const iw = image.naturalWidth, ih = image.naturalHeight;
  const factor = (cover ? Math.max : Math.min)(dw / iw, dh / ih);
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.fillStyle = '#e5dfce';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.drawImage(image, dx + (dw - iw * factor) / 2, dy + (dh - ih * factor) / 2, iw * factor, ih * factor);
  ctx.restore();
}
async function buildFile(plan) {
  const [photo, reference] = await Promise.all([loadPicture(plan.photo.src), loadPicture(plan.lead.image)]);
  const c = document.createElement('canvas');
  c.width = 1300;
  c.height = 928 + plan.products.length * 93 + (plan.deferred ? 84 : 0) + (plan.notes ? 168 : 0);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Graphics unavailable');
  ctx.fillStyle = '#f8f3e6';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#223729';
  ctx.fillRect(0, 0, c.width, 228);
  ctx.fillStyle = '#ead5a4';
  ctx.font = '650 27px ' + font;
  ctx.fillText('竹禅迹 · 竹居体验馆', 56, 42);
  ctx.fillStyle = '#fff8e8';
  ctx.font = '760 61px ' + font;
  ctx.fillText(plan.scene.room + '的竹居搭配', 52, 83);
  ctx.font = '520 26px ' + font;
  ctx.fillText(plan.header, 56, 167);

  drawFit(ctx, photo, 54, 258, 584, 352, false);
  drawFit(ctx, reference, 662, 258, 584, 352, false);
  ctx.font = '650 24px ' + font;
  for (const [x, label] of [[70, '你的实拍'], [678, '店铺原图 · ' + plan.lead.name]]) {
    ctx.fillStyle = '#22372a';
    ctx.fillRect(x, 551, ctx.measureText(label).width + 32, 43);
    ctx.fillStyle = '#fff8e4';
    ctx.fillText(label, x + 16, 560);
  }
  ctx.font = '550 24px ' + font;
  ctx.fillStyle = '#4b5c47';
  drawLines(ctx, plan.context, 55, 631, 1190, 33, 2);
  ctx.fillStyle = '#263b2b';
  ctx.font = '760 35px ' + font;
  ctx.fillText('竹器建议与摆放', 52, 711);

  let y = 784;
  for (const [i, product] of plan.products.entries()) {
    ctx.fillStyle = '#e0e7d5';
    ctx.fillRect(54, y - 3, 45, 41);
    ctx.fillStyle = '#38563c';
    ctx.font = '760 25px ' + font;
    ctx.fillText(String(i + 1).padStart(2, '0'), 59, y + 4);
    ctx.fillStyle = '#233629';
    ctx.font = '730 29px ' + font;
    ctx.fillText(product.name, 116, y - 4);
    ctx.fillStyle = '#4a5a46';
    ctx.font = '520 25px ' + font;
    drawLines(ctx, placement(product, plan), 116, y + 33, 1128, 31, 2);
    y += 93;
  }
  if (plan.deferred) {
    ctx.font = '530 24px ' + font;
    ctx.fillStyle = '#74502c';
    drawLines(ctx, plan.deferred, 54, y + 4, 1192, 31, 2);
    y += 84;
  }
  if (plan.notes) {
    ctx.fillStyle = '#eee8d8';
    ctx.fillRect(52, y - 3, 1196, 152);
    ctx.fillStyle = '#283d2d';
    ctx.font = '750 25px ' + font;
    ctx.fillText('给店铺的备注', 74, y + 14);
    ctx.font = '520 23px ' + font;
    drawLines(ctx, plan.notes, 74, y + 50, 1148, 25, 4);
    y += 168;
  }
  ctx.fillStyle = '#dcd8c6';
  ctx.fillRect(52, y + 12, 1196, 2);
  ctx.fillStyle = '#4d5a48';
  ctx.font = '520 23px ' + font;
  ctx.fillText('此图可发给店铺客服；实际款式及尺寸请向店铺核对。', 54, y + 40);
  const jpg = await new Promise((resolve, reject) => c.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Export failed')), 'image/jpeg', .86));
  return new File([jpg], '竹禅迹-竹居搭配单.jpg', { type: 'image/jpeg' });
}

const save = $('save-plan'), share = $('share-plan'), fallback = $('download-fallback');
function clearExport() {
  clearTimeout(state.timer);
  state.exportSeq++;
  state.file = null;
  if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
  state.downloadUrl = null;
  fallback.hidden = true;
  fallback.removeAttribute('href');
  save.disabled = true;
  share.hidden = true;
  $('export-status').textContent = '';
}
function queueExport(plan) {
  clearExport();
  const seq = state.exportSeq;
  state.timer = setTimeout(async () => {
    try {
      const file = await buildFile(plan);
      if (seq !== state.exportSeq) return;
      state.file = file;
      save.disabled = false;
      share.hidden = !(navigator.share && navigator.canShare?.({ files: [file] }));
    } catch {
      if (seq === state.exportSeq) {
        $('export-status').textContent = '搭配图暂未做好。你可重新选择照片后再保存。';
      }
    }
  }, 130);
}
save.addEventListener('click', () => {
  if (!state.file) return;
  if (!state.downloadUrl) state.downloadUrl = URL.createObjectURL(state.file);
  const link = document.createElement('a');
  link.href = state.downloadUrl;
  link.download = state.file.name;
  document.body.append(link);
  link.click();
  link.remove();
  fallback.href = state.downloadUrl;
  fallback.target = '_blank';
  fallback.rel = 'noopener noreferrer';
  fallback.hidden = false;
  $('export-status').textContent = '搭配图已准备好。到店铺聊天时，可以把这张图发给客服。';
});
share.addEventListener('click', async () => {
  if (!state.file) return;
  try { await navigator.share({ title: '竹禅迹 · 竹居搭配单', files: [state.file] }); }
  catch (error) {
    if (error.name !== 'AbortError') $('export-status').textContent = '系统分享暂不可用，可以先保存搭配单。';
  }
});
