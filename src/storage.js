const KEY = 'sheet-viewer-data';

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { events: [] };
    return JSON.parse(raw);
  } catch {
    return { events: [] };
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert(
        'Storage limit reached! Your browser localStorage is full.\n' +
        'Consider removing unused events or images to free up space.'
      );
    } else {
      console.error('Failed to save data:', e);
    }
    return false;
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createEvent(name) {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    pages: [],
  };
}

export function createPage(layout, name) {
  const count = Number(layout);
  const sheets = Array.from({ length: count }, () => ({
    id: generateId(),
    imageData: null,
  }));
  return {
    id: generateId(),
    name: name || 'Page',
    layout: count,
    sheets,
    drawings: {},
  };
}
