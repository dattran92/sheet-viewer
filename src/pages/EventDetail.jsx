import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadData, saveData, createPage } from '../storage.js';
import SheetSlot from '../components/SheetSlot.jsx';
import PageMenu from '../components/PageMenu.jsx';
import Modal from '../components/Modal.jsx';
import modalStyles from '../components/Modal.module.css';
import styles from './EventDetail.module.css';

const COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#ff3030', label: 'Red' },
  { value: '#0066ff', label: 'Blue' },
];

const WEIGHTS = [
  { value: 'thin', label: 'Thin', px: 2 },
  { value: 'medium', label: 'Medium', px: 4 },
  { value: 'thick', label: 'Thick', px: 8 },
];

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [lineWeight, setLineWeight] = useState('medium');
  const [color, setColor] = useState('#000000');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPageName, setEditingPageName] = useState(false);
  const [pageNameDraft, setPageNameDraft] = useState('');
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageLayout, setNewPageLayout] = useState('1');
  const [newPageName, setNewPageName] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingDeletePageIndex, setPendingDeletePageIndex] = useState(null);

  // Refs for DrawingCanvas instances (one per slot on current page)
  const drawingRefs = useRef([]);

  useEffect(() => {
    const data = loadData();
    const found = data.events.find((ev) => ev.id === id);
    if (!found) {
      navigate('/');
      return;
    }
    setEvent(found);
  }, [id, navigate]);

  // Persist changes to localStorage
  const persistEvent = useCallback((updatedEvent) => {
    const data = loadData();
    const events = data.events.map((ev) =>
      ev.id === updatedEvent.id ? updatedEvent : ev
    );
    saveData({ ...data, events });
    setEvent(updatedEvent);
  }, []);

  function openNewPageModal() {
    setNewPageLayout('1');
    setNewPageName(`Page ${event.pages.length + 1}`);
    setShowNewPageModal(true);
  }

  function handleAddPage() {
    const layout = parseInt(newPageLayout, 10);
    const name = newPageName.trim() || `Page ${event.pages.length + 1}`;
    const newPage = createPage(layout, name);
    const updatedEvent = {
      ...event,
      pages: [...event.pages, newPage],
    };
    persistEvent(updatedEvent);
    setCurrentPageIndex(updatedEvent.pages.length - 1);
    setShowNewPageModal(false);
  }

  function handleImageLoad(slotIndex, base64) {
    const page = event.pages[currentPageIndex];
    const updatedSheets = page.sheets.map((s, i) =>
      i === slotIndex ? { ...s, imageData: base64 } : s
    );
    const updatedPages = event.pages.map((p, i) =>
      i === currentPageIndex ? { ...p, sheets: updatedSheets } : p
    );
    persistEvent({ ...event, pages: updatedPages });
  }

  function handleDrawingSave(slotIndex, dataURL) {
    const page = event.pages[currentPageIndex];
    const updatedDrawings = { ...page.drawings };
    if (dataURL === null) {
      delete updatedDrawings[slotIndex];
    } else {
      updatedDrawings[slotIndex] = dataURL;
    }
    const updatedPages = event.pages.map((p, i) =>
      i === currentPageIndex ? { ...p, drawings: updatedDrawings } : p
    );
    persistEvent({ ...event, pages: updatedPages });
  }

  function handleRenamePage(newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updatedPages = event.pages.map((p, i) =>
      i === currentPageIndex ? { ...p, name: trimmed } : p
    );
    persistEvent({ ...event, pages: updatedPages });
  }

  function handleDeletePage() {
    const idx = pendingDeletePageIndex;
    const updatedPages = event.pages.filter((_, i) => i !== idx);
    const newIndex = Math.min(currentPageIndex, Math.max(0, updatedPages.length - 1));
    drawingRefs.current = [];
    persistEvent({ ...event, pages: updatedPages });
    setCurrentPageIndex(newIndex);
    setPendingDeletePageIndex(null);
  }

  function handleUndo() {
    drawingRefs.current.forEach((ref) => ref?.undo());
  }

  function handleClear() {
    drawingRefs.current.forEach((ref) => ref?.clear());
    setShowClearModal(false);
  }

  if (!event) return null;

  const pages = event.pages;
  const currentPage = pages[currentPageIndex] ?? null;
  const totalPages = pages.length;

  // Clamp index if pages were removed
  const safeIndex = Math.min(currentPageIndex, Math.max(0, totalPages - 1));
  if (safeIndex !== currentPageIndex && totalPages > 0) {
    setCurrentPageIndex(safeIndex);
  }

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <button
          className={styles.navBtn}
          onClick={() => navigate('/')}
          aria-label="Back"
        >
          &#8592;
        </button>
        <span className={styles.eventName}>{event.name}</span>
        <button
          className={styles.navBtn}
          onClick={() => setMenuOpen(true)}
          aria-label="Open page menu"
        >
          &#9776;
        </button>
      </nav>

      {/* Sheet Area */}
      <div className={styles.sheetArea}>
        {totalPages === 0 ? (
          <div className={styles.noPages}>
            <p>No pages yet.</p>
            <button className={styles.addFirstBtn} onClick={openNewPageModal}>
              + Add First Page
            </button>
          </div>
        ) : currentPage ? (
          <div
            className={styles.slotsRow}
            data-layout={currentPage.layout}
          >
            {currentPage.sheets.map((sheet, idx) => {
              if (!drawingRefs.current[idx]) {
                drawingRefs.current[idx] = null;
              }
              return (
                <SheetSlot
                  key={sheet.id}
                  sheet={sheet}
                  onImageLoad={(base64) => handleImageLoad(idx, base64)}
                  drawing={currentPage.drawings?.[idx] ?? null}
                  onDrawingSave={(dataURL) => handleDrawingSave(idx, dataURL)}
                  drawingRef={(el) => (drawingRefs.current[idx] = el)}
                  lineWeight={lineWeight}
                  color={color}
                  drawMode={drawMode}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Drawing Toolbar */}
      {totalPages > 0 && (
        <div className={styles.toolbar}>
          <button
            className={`${styles.toolBtn} ${drawMode ? styles.toolBtnActive : ''}`}
            onClick={() => setDrawMode((v) => !v)}
            title={drawMode ? 'Disable drawing' : 'Enable drawing'}
            aria-pressed={drawMode}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>

          <span className={styles.toolSep} />

          {WEIGHTS.map((w) => (
            <button
              key={w.value}
              className={`${styles.weightBtn} ${lineWeight === w.value ? styles.toolBtnActive : ''}`}
              onClick={() => setLineWeight(w.value)}
              title={w.label}
              disabled={!drawMode}
            >
              <span
                className={styles.weightDot}
                style={{ width: w.px + 4, height: w.px + 4 }}
              />
            </button>
          ))}

          <span className={styles.toolSep} />

          {COLORS.map((c) => (
            <button
              key={c.value}
              className={`${styles.colorBtn} ${color === c.value ? styles.colorBtnActive : ''}`}
              onClick={() => setColor(c.value)}
              title={c.label}
              disabled={!drawMode}
              style={{ '--swatch': c.value }}
            />
          ))}

          <span className={styles.toolSep} />

          <button
            className={styles.toolBtn}
            onClick={handleUndo}
            disabled={!drawMode}
            title="Undo last stroke"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4"/>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
          </button>

          <button
            className={styles.toolBtn}
            onClick={() => setShowClearModal(true)}
            disabled={!drawMode}
            title="Clear drawings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      )}

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <button
          className={styles.navPageBtn}
          onClick={() => {
            drawingRefs.current = [];
            setCurrentPageIndex((i) => Math.max(0, i - 1));
          }}
          disabled={currentPageIndex === 0 || totalPages === 0}
          aria-label="Previous page"
        >
          &#8592; Prev
        </button>

        <span className={styles.pageIndicator}>
          {totalPages === 0 ? '—' : (
            <>
              {editingPageName ? (
                <input
                  className={styles.pageNameInput}
                  value={pageNameDraft}
                  autoFocus
                  onChange={(e) => setPageNameDraft(e.target.value)}
                  onBlur={() => {
                    handleRenamePage(pageNameDraft);
                    setEditingPageName(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                    if (e.key === 'Escape') setEditingPageName(false);
                  }}
                />
              ) : (
                <span
                  className={styles.pageName}
                  title="Click to rename"
                  onClick={() => {
                    setPageNameDraft(currentPage?.name || '');
                    setEditingPageName(true);
                  }}
                >
                  {currentPage?.name}
                </span>
              )}
              <span className={styles.pageCount}>{currentPageIndex + 1}/{totalPages}</span>
            </>
          )}
        </span>

        <button
          className={styles.navPageBtn}
          onClick={() => {
            drawingRefs.current = [];
            setCurrentPageIndex((i) => Math.min(totalPages - 1, i + 1));
          }}
          disabled={currentPageIndex >= totalPages - 1 || totalPages === 0}
          aria-label="Next page"
        >
          Next &#8594;
        </button>

        <button
          className={styles.addPageBtn}
          onClick={openNewPageModal}
          aria-label="Add page"
          title="Add page"
        >
          + Page
        </button>
      </div>

      {/* Page Menu */}
      {menuOpen && (
        <PageMenu
          pages={pages}
          currentIndex={currentPageIndex}
          onSelect={(idx) => {
            drawingRefs.current = [];
            setCurrentPageIndex(idx);
          }}
          onDelete={(idx) => {
            setPendingDeletePageIndex(idx);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* New Page Modal */}
      {showNewPageModal && (
        <Modal
          title="New Page"
          onClose={() => setShowNewPageModal(false)}
          footer={
            <>
              <button className={modalStyles.btnSecondary} onClick={() => setShowNewPageModal(false)}>Cancel</button>
              <button className={modalStyles.btnPrimary} onClick={handleAddPage} disabled={!newPageName.trim()}>Add Page</button>
            </>
          }
        >
          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Layout</label>
            <select
              className={modalStyles.select}
              value={newPageLayout}
              onChange={(e) => setNewPageLayout(e.target.value)}
            >
              <option value="1">1 sheet</option>
              <option value="2">2 sheets side by side</option>
              <option value="3">3 sheets side by side</option>
            </select>
          </div>
          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Page name</label>
            <input
              className={modalStyles.input}
              placeholder="e.g. Intro"
              value={newPageName}
              autoFocus
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPage(); }}
            />
          </div>
        </Modal>
      )}

      {/* Delete Page Confirm Modal */}
      {pendingDeletePageIndex !== null && (
        <Modal
          title="Delete Page"
          onClose={() => setPendingDeletePageIndex(null)}
          footer={
            <>
              <button className={modalStyles.btnSecondary} onClick={() => setPendingDeletePageIndex(null)}>Cancel</button>
              <button className={modalStyles.btnDanger} onClick={handleDeletePage}>Delete</button>
            </>
          }
        >
          <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
            Delete <strong>"{pages[pendingDeletePageIndex]?.name || `Page ${pendingDeletePageIndex + 1}`}"</strong>? This cannot be undone.
          </p>
        </Modal>
      )}

      {/* Clear Drawings Confirm Modal */}
      {showClearModal && (
        <Modal
          title="Clear Drawings"
          onClose={() => setShowClearModal(false)}
          footer={
            <>
              <button className={modalStyles.btnSecondary} onClick={() => setShowClearModal(false)}>Cancel</button>
              <button className={modalStyles.btnDanger} onClick={handleClear}>Clear</button>
            </>
          }
        >
          <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
            Clear all drawings on this page? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
