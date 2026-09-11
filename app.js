const galleryItems = {
  companion: { src: './assets/companion-desktop.png', caption: '日常陪伴 · 柔雾粉', alt: '日常陪伴界面，左侧为 3D 精灵，右侧为聊天和语音入口' },
  games: { src: './assets/knowledge-desktop.png', caption: '游戏资料 · 饥荒联机版原版知识', alt: '饥荒联机版资料工作台，展示带有版本信息的原版知识与查询入口' },
  settings: { src: './assets/settings-desktop.png', caption: '个性设置 · 晴空蓝', alt: 'GameMate 设置界面，包含陪伴偏好、界面主题和语音配置' },
};
document.querySelectorAll('.setup-link').forEach(anchor => { anchor.href = './setup.html'; });

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '打开导航菜单');
  mobileMenu.hidden = true;
}
menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(expanded));
  menuToggle.setAttribute('aria-label', expanded ? '关闭导航菜单' : '打开导航菜单');
  mobileMenu.hidden = !expanded;
});
mobileMenu?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

const galleryTabs = Array.from(document.querySelectorAll('[data-gallery]'));
let activeGallery = 'companion';
function selectGallery(button) {
  const item = galleryItems[button.dataset.gallery];
  if (!item) return;
  activeGallery = button.dataset.gallery;
  for (const tab of galleryTabs) {
    const selected = tab === button;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  const image = document.querySelector('#gallery-image');
  image.src = item.src;
  image.alt = item.alt;
  image.classList.remove('is-changing');
  requestAnimationFrame(() => image.classList.add('is-changing'));
  document.querySelector('#gallery-caption').textContent = item.caption;
  document.querySelector('#product-panel').setAttribute('aria-labelledby', button.id);
}
galleryTabs.forEach((button, index) => {
  button.addEventListener('click', () => selectGallery(button));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % galleryTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + galleryTabs.length) % galleryTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = galleryTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    galleryTabs[next].focus();
    selectGallery(galleryTabs[next]);
  });
});
const imageDialog = document.querySelector('#image-dialog');
document.querySelector('#expand-image')?.addEventListener('click', () => {
  const item = galleryItems[activeGallery];
  const image = document.querySelector('#dialog-image');
  image.src = item.src;
  image.alt = item.alt;
  document.querySelector('#dialog-caption').textContent = item.caption;
  imageDialog.showModal();
  document.body.classList.add('modal-open');
});
imageDialog?.querySelector('.dialog-close').addEventListener('click', () => imageDialog.close());
imageDialog?.addEventListener('click', event => {
  if (event.target !== imageDialog) return;
  const bounds = imageDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) imageDialog.close();
});
imageDialog?.addEventListener('close', () => document.body.classList.remove('modal-open'));

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function safeLink(value, { download = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, window.location.href);
    if (url.username || url.password) return null;
    const sameOrigin = url.origin === location.origin && ['http:', 'https:'].includes(url.protocol);
    if (sameOrigin && download) return url.href;
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
    if (download && !/^\/[^/]+\/[^/]+\/releases\/download\/.+/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

function repositoryUrl(repository) {
  if (!repository || typeof repository !== 'object') return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(repository.owner ?? '') || !/^[A-Za-z0-9_.-]+$/.test(repository.name ?? '')) return null;
  return `https://github.com/${repository.owner}/${repository.name}`;
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function unavailableDownloads(message) {
  document.querySelectorAll('[data-download]').forEach(option => {
    const anchor = option.querySelector('.asset-download');
    anchor.removeAttribute('href');
    anchor.removeAttribute('download');
    anchor.setAttribute('aria-disabled', 'true');
    anchor.querySelector('span').textContent = message;
    option.querySelector('.asset-size').textContent = '暂未提供';
    option.querySelector('.asset-checksum').textContent = '发布后提供';
    option.querySelector('.copy-checksum').disabled = true;
  });
}

function applyRelease(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.downloads) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) {
    throw new Error('发布信息格式不正确，请稍后重试。');
  }
  const repository = repositoryUrl(manifest.repository);
  const published = formatDate(manifest.publishedAt);
  const releaseUrl = published ? safeLink(manifest.releaseUrl) : null;
  document.querySelectorAll('.repository-link').forEach(anchor => {
    anchor.hidden = !repository;
    if (repository) anchor.href = repository;
  });
  document.querySelectorAll('.release-link').forEach(anchor => {
    anchor.hidden = !releaseUrl;
    if (releaseUrl) anchor.href = releaseUrl;
  });
  document.querySelectorAll('.setup-link').forEach(anchor => { anchor.href = './setup.html'; });
  const versionElement = document.querySelector('#release-version');
  if (versionElement) versionElement.textContent = published ? `v${manifest.version} · ${published}` : `v${manifest.version} · 等待发布`;
  const logTitle = document.querySelector('#changelog-version');
  if (logTitle) logTitle.textContent = `v${manifest.version}`;
  const logDate = document.querySelector('#changelog-date');
  if (logDate) logDate.textContent = published ?? '尚未发布；以下为待发布内容。';
  const noteList = document.querySelector('#release-notes');
  if (noteList && Array.isArray(manifest.notes) && manifest.notes.length) {
    noteList.replaceChildren(...manifest.notes.filter(note => typeof note === 'string').map(note => {
      const li = document.createElement('li');
      li.textContent = note;
      return li;
    }));
  }
  unavailableDownloads('尚未发布');
  let downloadCount = 0;
  for (const option of document.querySelectorAll('[data-download]')) {
    const asset = manifest.downloads.find(download => download?.kind === option.dataset.download && download.platform === 'windows' && download.arch === 'x64');
    const url = safeLink(asset?.url, { download: true });
    if ((!published && manifest.distribution !== 'local') || !asset || !url || !Number.isSafeInteger(asset.size) || asset.size <= 0 || !/^[a-fA-F0-9]{64}$/.test(asset.sha256 ?? '') || typeof asset.name !== 'string') continue;
    const anchor = option.querySelector('.asset-download');
    anchor.href = url;
    anchor.download = asset.name;
    anchor.removeAttribute('aria-disabled');
    anchor.querySelector('span').textContent = option.dataset.download === 'installer' ? '下载 Windows 安装版' : '下载 Windows 便携版';
    option.querySelector('.asset-size').textContent = `.exe · ${formatBytes(asset.size)}`;
    option.querySelector('.asset-size').title = asset.name;
    option.querySelector('.asset-checksum').textContent = asset.sha256.toLowerCase();
    const copyButton = option.querySelector('.copy-checksum');
    copyButton.disabled = false;
    copyButton.dataset.checksum = asset.sha256.toLowerCase();
    downloadCount += 1;
  }
  const error = document.querySelector('#release-error');
  if (error) {
    error.hidden = downloadCount === 2;
    const message = downloadCount ? '部分安装文件尚未就绪，请通过下方可用入口下载。' : 'Windows 预览版尚未公开发布。发布后，此处会提供安装文件及校验值。';
    document.querySelector('#release-error-text').textContent = message;
  }
}

let releaseLoading = false;
async function loadRelease() {
  if (releaseLoading) return;
  releaseLoading = true;
  const retry = document.querySelector('#retry-release');
  if (retry) retry.disabled = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('./data/release.json', { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('暂时无法获取发布信息。');
    applyRelease(await response.json());
  } catch {
    unavailableDownloads('下载信息暂不可用');
    const version = document.querySelector('#release-version');
    if (version) version.textContent = '版本信息暂不可用';
    const error = document.querySelector('#release-error');
    if (error) {
      error.hidden = false;
      document.querySelector('#release-error-text').textContent = '暂时无法获取发布信息，请检查网络后重新获取。';
    }
    const date = document.querySelector('#changelog-date');
    if (date) date.textContent = '暂时无法获取发布信息，请刷新页面重试。';
  } finally {
    clearTimeout(timeout);
    releaseLoading = false;
    if (retry) retry.disabled = false;
  }
}
document.querySelector('#retry-release')?.addEventListener('click', loadRelease);
document.querySelectorAll('.copy-checksum').forEach(button => {
  button.addEventListener('click', async () => {
    if (!button.dataset.checksum) return;
    try {
      await navigator.clipboard.writeText(button.dataset.checksum);
      showToast('SHA-256 校验值已复制');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(button.closest('.checksum-row').querySelector('code'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      showToast('自动复制不可用，已选中校验值');
    }
  });
});
loadRelease();
