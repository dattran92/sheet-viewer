import { useEffect, useRef, useState } from 'react';
import styles from './PageMenu.module.css';

function LayoutIcon({ layout }) {
  return (
    <span className={styles.layoutIcon} title={`${layout} column(s)`}>
      {Array.from({ length: layout }, (_, i) => (
        <span key={i} className={styles.layoutBar} />
      ))}
    </span>
  );
}

function GripIcon() {
  return (
    <svg className={styles.gripIcon} width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
      <circle cx="4" cy="7" r="1.2"/><circle cx="10" cy="7" r="1.2"/>
      <circle cx="4" cy="11" r="1.2"/><circle cx="10" cy="11" r="1.2"/>
    </svg>
  );
}

export default function PageMenu({ pages, currentIndex, onSelect, onDelete, onReorder, onClose }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleGripPointerDown(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    listRef.current.setPointerCapture(e.pointerId);
    setDragIdx(idx);
    setOverIdx(idx);
  }

  function handlePointerMove(e) {
    if (dragIdx === null) return;
    const items = listRef.current.querySelectorAll('[data-idx]');
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY < rect.bottom) {
        setOverIdx(Number(item.dataset.idx));
        return;
      }
    }
  }

  function handlePointerUp() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      onReorder(dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Pages</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
            &#10005;
          </button>
        </div>
        <ul
          ref={listRef}
          className={styles.pageList}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {pages.length === 0 && (
            <li className={styles.emptyMsg}>No pages yet</li>
          )}
          {pages.map((page, idx) => {
            const isDragging = dragIdx === idx;
            const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
            const dropAbove = isOver && dragIdx > idx;
            const dropBelow = isOver && dragIdx < idx;
            return (
              <li
                key={page.id}
                data-idx={idx}
                className={[
                  styles.pageRow,
                  isDragging ? styles.dragging : '',
                  dropAbove ? styles.dropAbove : '',
                  dropBelow ? styles.dropBelow : '',
                ].join(' ')}
              >
                <span
                  className={styles.grip}
                  onPointerDown={(e) => handleGripPointerDown(e, idx)}
                  title="Drag to reorder"
                >
                  <GripIcon />
                </span>
                <button
                  className={`${styles.pageItem} ${idx === currentIndex ? styles.active : ''}`}
                  onClick={() => { if (dragIdx === null) { onSelect(idx); onClose(); } }}
                >
                  <span className={styles.pageNum}>{page.name || `Page ${idx + 1}`}</span>
                  <LayoutIcon layout={page.layout} />
                </button>
                <button
                  className={styles.deletePageBtn}
                  onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
                  aria-label={`Delete ${page.name || `Page ${idx + 1}`}`}
                  title="Delete page"
                >
                  &#128465;
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
