let rootPromise = null;

function getRoot() {
  if (!rootPromise) {
    rootPromise = navigator.storage.getDirectory();
  }
  return rootPromise;
}

export async function saveImageFile(filename, source) {
  const root = await getRoot();
  const fh = await root.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  if (source instanceof Blob) {
    await writable.write(source);
  } else {
    // dataURL from canvas
    const res = await fetch(source);
    const blob = await res.blob();
    await writable.write(blob);
  }
  await writable.close();
}

export async function getImageURL(filename) {
  if (!filename) return null;
  const root = await getRoot();
  const fh = await root.getFileHandle(filename);
  const file = await fh.getFile();
  return URL.createObjectURL(file);
}

export async function deleteImageFile(filename) {
  if (!filename) return;
  try {
    const root = await getRoot();
    await root.removeEntry(filename);
  } catch {
    // ignore — file may already be gone
  }
}

export async function deleteSheetImages(sheet) {
  const { imageFile, originalImageFile } = sheet;
  if (originalImageFile) await deleteImageFile(originalImageFile);
  if (imageFile && imageFile !== originalImageFile) await deleteImageFile(imageFile);
}
