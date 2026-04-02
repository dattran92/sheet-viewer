import { useRef, useState, useEffect } from 'react';
import { generateId } from '../storage.js';
import { saveImageFile, getImageURL } from '../imageStore.js';
import DrawingCanvas from './DrawingCanvas.jsx';
import CropModal from './CropModal.jsx';
import styles from './SheetSlot.module.css';

export default function SheetSlot({
  sheet,
  onImageLoad,   // (imageFile) => void  — called after file saved to OPFS
  onCropApply,   // (imageFile) => void  — called after crop saved to OPFS
  drawing,
  onDrawingSave,
  drawingRef,
  lineWeight,
  color,
  drawMode,
}) {
  const fileInputRef = useRef(null);
  const [displayURL, setDisplayURL] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load object URL from OPFS whenever imageFile changes
  useEffect(() => {
    let url = null;
    let cancelled = false;
    if (sheet.imageFile) {
      getImageURL(sheet.imageFile).then((u) => {
        if (!cancelled) {
          url = u;
          setDisplayURL(u);
        } else {
          URL.revokeObjectURL(u);
        }
      }).catch(() => setDisplayURL(null));
    } else {
      setDisplayURL(null);
    }
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [sheet.imageFile]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setSaving(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = generateId() + '.' + ext;
    await saveImageFile(filename, file);
    onImageLoad(filename);
    setSaving(false);
  }

  async function handleCropConfirm(dataURL) {
    const filename = generateId() + '.jpg';
    await saveImageFile(filename, dataURL);
    onCropApply(filename);
    setCropOpen(false);
  }

  return (
    <div className={styles.slot}>
      {displayURL ? (
        <img
          className={styles.image}
          src={displayURL}
          alt="Sheet music"
          draggable={false}
        />
      ) : (
        <button
          className={styles.uploadBtn}
          onClick={() => !drawMode && fileInputRef.current?.click()}
          disabled={drawMode || saving}
          title="Upload sheet music image"
        >
          <span className={styles.uploadIcon}>{saving ? '…' : '+'}</span>
          <span className={styles.uploadLabel}>{saving ? 'Saving…' : 'Upload Image'}</span>
        </button>
      )}

      {displayURL && !drawMode && (
        <div className={styles.slotActions}>
          <button
            className={styles.slotActionBtn}
            onClick={() => setCropOpen(true)}
            title="Crop image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
              <path d="M18 22V8a2 2 0 0 0-2-2H2"/>
            </svg>
          </button>
          <button
            className={styles.slotActionBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Replace image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <DrawingCanvas
        ref={drawingRef}
        drawing={drawing ?? null}
        onSave={onDrawingSave}
        lineWeight={lineWeight}
        color={color}
        drawMode={drawMode}
      />

      {cropOpen && (
        <CropModal
          originalImageFile={sheet.originalImageFile || sheet.imageFile}
          onConfirm={handleCropConfirm}
          onClose={() => setCropOpen(false)}
        />
      )}
    </div>
  );
}
