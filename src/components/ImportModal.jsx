import { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import modalStyles from './Modal.module.css';
import styles from './ImportModal.module.css';

export default function ImportModal({ files, onConfirm, onClose }) {
  const [items, setItems] = useState(() =>
    files.map((file) => ({
      file,
      name: file.name.replace(/\.[^.]+$/, ''),
      previewURL: null,
    }))
  );
  const [lightbox, setLightbox] = useState(null);

  // Create object URLs in effect so they survive StrictMode double-invocation
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setItems((prev) => prev.map((item, i) => ({ ...item, previewURL: urls[i] })));
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && lightbox) setLightbox(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  function setName(idx, value) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, name: value } : item))
    );
  }

  function handleConfirm() {
    onConfirm(items.map(({ file, name }) => ({ file, name: name.trim() || file.name })));
  }

  return (
    <>
      <Modal
        title={`Import ${files.length} image${files.length > 1 ? 's' : ''}`}
        onClose={onClose}
        footer={
          <>
            <button className={modalStyles.btnSecondary} onClick={onClose}>Cancel</button>
            <button className={modalStyles.btnPrimary} onClick={handleConfirm}>
              Add {files.length} page{files.length > 1 ? 's' : ''}
            </button>
          </>
        }
      >
        <ul className={styles.list}>
          {items.map((item, idx) => (
            <li key={idx} className={styles.row}>
              <img
                src={item.previewURL}
                alt=""
                className={styles.thumb}
                onClick={() => setLightbox(item.previewURL)}
                title="Click to preview"
              />
              <input
                className={modalStyles.input}
                value={item.name}
                onChange={(e) => setName(idx, e.target.value)}
                placeholder={`Page ${idx + 1}`}
              />
            </li>
          ))}
        </ul>
      </Modal>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Preview" className={styles.lightboxImg} />
        </div>
      )}
    </>
  );
}
