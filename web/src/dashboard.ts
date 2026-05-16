/**
 * Dashboard page logic — layout CRUD, PDF download.
 */
import { requireAuth, getUser, logout, authFetch } from './auth/auth.ts';

// Auth guard
requireAuth();

// ─── Types ───
interface LayoutItem {
  id: number;
  user_id: number;
  name: string;
  description: string;
  thumbnail: string;
  template_data: any;
  data_source: any;
  items_per_page: number;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

// ─── DOM Refs ───
const sampleGrid = document.getElementById('sample-grid')!;
const myGrid = document.getElementById('my-grid')!;
const myLayoutsCount = document.getElementById('my-layouts-count')!;
const userName = document.getElementById('user-name')!;
const userAvatar = document.getElementById('user-avatar')!;
const toastContainer = document.getElementById('toast-container')!;

// ─── Init ───
const user = getUser();
if (user) {
  userName.textContent = user.name || user.email;
  userAvatar.textContent = (user.name || user.email).charAt(0).toUpperCase();
}

document.getElementById('btn-logout')!.addEventListener('click', logout);
document.getElementById('btn-create-new')!.addEventListener('click', () => {
  window.location.href = '/index.html';
});

// ─── Load layouts ───
loadLayouts();

async function loadLayouts(): Promise<void> {
  try {
    const res = await authFetch('/api/layouts');
    if (!res.ok) {
      if (res.status === 401) { logout(); return; }
      throw new Error('Failed to load layouts');
    }
    const data = await res.json();
    const layouts: LayoutItem[] = data.layouts;

    const samples = layouts.filter(l => l.is_sample);
    const mine = layouts.filter(l => !l.is_sample);

    renderSampleLayouts(samples);
    renderMyLayouts(mine);
  } catch (err: any) {
    showToast('Không thể tải layouts: ' + err.message, 'error');
    sampleGrid.innerHTML = '';
    renderEmptyState(myGrid, 'Không thể kết nối server');
  }
}

// ─── Render Functions ───

function renderSampleLayouts(layouts: LayoutItem[]): void {
  if (layouts.length === 0) {
    sampleGrid.innerHTML = '<div class="dash-empty"><div class="dash-empty-icon">📋</div><div class="dash-empty-text">Chưa có layout mẫu nào</div></div>';
    return;
  }
  sampleGrid.innerHTML = layouts.map(layout => renderCard(layout, true)).join('');
  attachCardListeners(sampleGrid, true);
}

function renderMyLayouts(layouts: LayoutItem[]): void {
  myLayoutsCount.textContent = String(layouts.length);

  if (layouts.length === 0) {
    renderEmptyState(myGrid, 'Bạn chưa có layout nào. Nhấn "Tạo layout mới" để bắt đầu!');
    return;
  }

  myGrid.innerHTML = layouts.map(layout => renderCard(layout, false)).join('');
  attachCardListeners(myGrid, false);
}

function renderEmptyState(container: HTMLElement, text: string): void {
  container.innerHTML = `
    <div class="dash-empty" style="grid-column:1/-1;">
      <div class="dash-empty-icon">📝</div>
      <div class="dash-empty-text">${text}</div>
    </div>`;
}

const THUMB_ICONS: Record<string, string> = {
  'Elegant Workbook': '📖',
  '3 Words Practice': '✍️',
  'Minimal': '📄',
  'Flashcard': '🃏',
};

function renderCard(layout: LayoutItem, isSample: boolean): string {
  const date = new Date(layout.updated_at || layout.created_at);
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const icon = THUMB_ICONS[layout.name] || '📐';
  const sampleClass = isSample ? ' sample-card' : '';
  const sampleBadge = isSample ? '<span class="card-sample-badge">Mẫu</span>' : '';

  const actions = isSample
    ? `<div class="card-actions">
        <button class="card-action-btn btn-pdf" title="Tải PDF" data-action="pdf" data-id="${layout.id}">📥</button>
        <button class="card-action-btn" title="Dùng làm mẫu" data-action="use" data-id="${layout.id}">📋</button>
       </div>`
    : `<div class="card-actions">
        <button class="card-action-btn" title="Chỉnh sửa" data-action="edit" data-id="${layout.id}">✏️</button>
        <button class="card-action-btn btn-pdf" title="Tải PDF" data-action="pdf" data-id="${layout.id}">📥</button>
        <button class="card-action-btn btn-danger" title="Xóa" data-action="delete" data-id="${layout.id}">🗑</button>
       </div>`;

  return `
    <div class="layout-card${sampleClass}" data-layout-id="${layout.id}">
      <div class="card-thumbnail">
        <span class="card-thumbnail-placeholder">${icon}</span>
        ${sampleBadge}
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(layout.name)}</div>
        <div class="card-desc">${escapeHtml(layout.description || 'Không có mô tả')}</div>
        <div class="card-meta">
          <span class="card-date">${dateStr}</span>
          ${actions}
        </div>
      </div>
    </div>`;
}

function attachCardListeners(container: HTMLElement, isSample: boolean): void {
  container.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = (btn as HTMLElement).dataset.action;
      const id = parseInt((btn as HTMLElement).dataset.id || '0');
      if (action === 'edit') handleEdit(id);
      if (action === 'delete') handleDelete(id);
      if (action === 'pdf') handleDownloadPdf(id);
      if (action === 'use') handleUseSample(id);
    });
  });

  // Click card to edit (only for user layouts)
  if (!isSample) {
    container.querySelectorAll('.layout-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt((card as HTMLElement).dataset.layoutId || '0');
        handleEdit(id);
      });
    });
  }
}

// ─── Actions ───

function handleEdit(id: number): void {
  window.location.href = `/index.html?id=${id}`;
}

async function handleUseSample(id: number): Promise<void> {
  // Load sample layout, then open editor with that data as a new layout
  window.location.href = `/index.html?sample=${id}`;
}

async function handleDelete(id: number): Promise<void> {
  // Show confirm modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-title">Xóa layout?</div>
      <div class="modal-body">Bạn có chắc muốn xóa layout này? Hành động không thể hoàn tác.</div>
      <div class="modal-actions">
        <button class="modal-btn" id="modal-cancel">Hủy</button>
        <button class="modal-btn modal-btn-danger" id="modal-confirm">Xóa</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    overlay.querySelector('#modal-cancel')!.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); resolve(); }
    });
    overlay.querySelector('#modal-confirm')!.addEventListener('click', async () => {
      overlay.remove();
      try {
        const res = await authFetch(`/api/layouts/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        showToast('Đã xóa layout thành công', 'success');
        loadLayouts();
      } catch (err: any) {
        showToast('Xóa thất bại: ' + err.message, 'error');
      }
      resolve();
    });
  });
}

async function handleDownloadPdf(id: number): Promise<void> {
  showToast('Đang tạo PDF...', 'info');

  try {
    // Fetch layout data
    const layoutRes = await authFetch(`/api/layouts/${id}`);
    if (!layoutRes.ok) throw new Error('Cannot load layout');
    const { layout } = await layoutRes.json();

    const templateData = layout.template_data;
    const elements = templateData.elements || [];
    const dataSource = layout.data_source || [];

    // Request PDF
    const pdfRes = await authFetch('/api/pdf/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateElements: elements,
        dataArray: Array.isArray(dataSource) ? dataSource : [],
        itemsPerPage: layout.items_per_page || 1,
      }),
    });

    if (!pdfRes.ok) {
      const err = await pdfRes.json().catch(() => ({ error: 'PDF generation failed' }));
      throw new Error(err.error);
    }

    // Download blob
    const blob = await pdfRes.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layout.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('PDF đã được tải xuống!', 'success');
  } catch (err: any) {
    showToast('Tạo PDF thất bại: ' + err.message, 'error');
  }
}

// ─── Utilities ───

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
