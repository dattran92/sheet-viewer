import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loadData, saveData, createEvent } from '../storage.js';
import { deleteSheetImages } from '../imageStore.js';
import Modal from '../components/Modal.jsx';
import modalStyles from '../components/Modal.module.css';
import styles from './HomePage.module.css';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    const data = loadData();
    setEvents(data.events || []);
  }, []);

  function openNewEventModal() {
    setNewEventName('');
    setShowNewEventModal(true);
  }

  function handleCreateEvent() {
    const name = newEventName.trim();
    if (!name) return;
    const newEvent = createEvent(name);
    const data = loadData();
    const updated = { ...data, events: [newEvent, ...(data.events || [])] };
    if (saveData(updated)) {
      setShowNewEventModal(false);
      navigate(`/event/${newEvent.id}`);
    }
  }

  function handleDelete() {
    const data = loadData();
    const deletedEvent = data.events.find((ev) => ev.id === pendingDeleteId);
    if (deletedEvent) {
      deletedEvent.pages.forEach((page) =>
        page.sheets.forEach((sheet) => deleteSheetImages(sheet))
      );
    }
    const updated = { ...data, events: data.events.filter((ev) => ev.id !== pendingDeleteId) };
    saveData(updated);
    setEvents(updated.events);
    setPendingDeleteId(null);
  }

  const pendingDeleteEvent = events.find((ev) => ev.id === pendingDeleteId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Sheet Viewer</h1>
        <button className={styles.newBtn} onClick={openNewEventModal}>
          + New Event
        </button>
      </header>

      <main className={styles.main}>
        {events.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>&#9835;</span>
            <p>No events yet.</p>
            <p className={styles.emptyHint}>Tap &quot;New Event&quot; to get started.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {events.map((ev) => (
              <li
                key={ev.id}
                className={styles.item}
                onClick={() => navigate(`/event/${ev.id}`)}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{ev.name}</span>
                  <span className={styles.itemMeta}>
                    {ev.pages.length} {ev.pages.length === 1 ? 'page' : 'pages'} &middot; {formatDate(ev.createdAt)}
                  </span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => { e.stopPropagation(); setPendingDeleteId(ev.id); }}
                  title="Delete event"
                  aria-label={`Delete ${ev.name}`}
                >
                  &#128465;
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* New Event Modal */}
      {showNewEventModal && (
        <Modal
          title="New Event"
          onClose={() => setShowNewEventModal(false)}
          footer={
            <>
              <button className={modalStyles.btnSecondary} onClick={() => setShowNewEventModal(false)}>Cancel</button>
              <button className={modalStyles.btnPrimary} onClick={handleCreateEvent} disabled={!newEventName.trim()}>Create</button>
            </>
          }
        >
          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Event name</label>
            <input
              className={modalStyles.input}
              placeholder="e.g. Spring Concert 2026"
              value={newEventName}
              autoFocus
              onChange={(e) => setNewEventName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateEvent(); }}
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {pendingDeleteEvent && (
        <Modal
          title="Delete Event"
          onClose={() => setPendingDeleteId(null)}
          footer={
            <>
              <button className={modalStyles.btnSecondary} onClick={() => setPendingDeleteId(null)}>Cancel</button>
              <button className={modalStyles.btnDanger} onClick={handleDelete}>Delete</button>
            </>
          }
        >
          <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
            Delete <strong>"{pendingDeleteEvent.name}"</strong>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
