import { useEffect } from 'react';
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

export default function PageMenu({ pages, currentIndex, onSelect, onDelete, onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <ul className={styles.pageList}>
          {pages.length === 0 && (
            <li className={styles.emptyMsg}>No pages yet</li>
          )}
          {pages.map((page, idx) => (
            <li key={page.id} className={styles.pageRow}>
              <button
                className={`${styles.pageItem} ${idx === currentIndex ? styles.active : ''}`}
                onClick={() => {
                  onSelect(idx);
                  onClose();
                }}
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
          ))}
        </ul>
      </aside>
    </>
  );
}
