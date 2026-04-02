import { useRef } from 'react';
import DrawingCanvas from './DrawingCanvas.jsx';
import styles from './SheetSlot.module.css';

export default function SheetSlot({
  sheet,
  onImageLoad,
  drawing,
  onDrawingSave,
  drawingRef,
  lineWeight,
  color,
  drawMode,
}) {
  const fileInputRef = useRef(null);

  function handleUploadClick() {
    if (drawMode) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      onImageLoad(ev.target.result);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className={styles.slot}>
      {sheet.imageData ? (
        <img
          className={styles.image}
          src={sheet.imageData}
          alt="Sheet music"
          draggable={false}
        />
      ) : (
        <button
          className={styles.uploadBtn}
          onClick={handleUploadClick}
          disabled={drawMode}
          title="Upload sheet music image"
        >
          <span className={styles.uploadIcon}>+</span>
          <span className={styles.uploadLabel}>Upload Image</span>
        </button>
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
    </div>
  );
}
