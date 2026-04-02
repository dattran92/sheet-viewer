import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { getImageURL } from '../imageStore.js';
import Modal from './Modal.jsx';
import modalStyles from './Modal.module.css';
import styles from './CropModal.module.css';

function applyCrop(imgEl, crop) {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    imgEl,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return canvas.toDataURL('image/jpeg', 0.92);
}

function fullCrop(imgEl) {
  return { unit: 'px', x: 0, y: 0, width: imgEl.width, height: imgEl.height };
}

export default function CropModal({ originalImageFile, onConfirm, onClose }) {
  const [imageURL, setImageURL] = useState(null);
  const [crop, setCrop] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    let url = null;
    getImageURL(originalImageFile).then((u) => {
      url = u;
      setImageURL(u);
    }).catch(() => setImageURL(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [originalImageFile]);

  const onImageLoad = useCallback((e) => {
    const c = fullCrop(e.currentTarget);
    setCrop(c);
    setCompletedCrop(c);
  }, []);

  function handleReset() {
    if (!imgRef.current) return;
    const c = fullCrop(imgRef.current);
    setCrop({ ...c });
    setCompletedCrop(c);
  }

  function handleConfirm() {
    if (!completedCrop || !imgRef.current) return;
    onConfirm(applyCrop(imgRef.current, completedCrop));
  }

  const canApply = completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

  return (
    <Modal
      title="Crop Image"
      onClose={onClose}
      footer={
        <>
          <button className={modalStyles.btnSecondary} onClick={handleReset}>Reset</button>
          <button className={modalStyles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={modalStyles.btnPrimary} onClick={handleConfirm} disabled={!canApply}>Apply</button>
        </>
      }
    >
      <div className={styles.cropArea}>
        {imageURL ? (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            keepSelection
          >
            <img
              ref={imgRef}
              src={imageURL}
              alt="Crop preview"
              className={styles.cropImg}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        ) : (
          <p style={{ color: 'var(--text-muted)', padding: '24px' }}>Loading…</p>
        )}
      </div>
    </Modal>
  );
}
