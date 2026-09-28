// Tracks which events this browser has joined, so the participant dashboard
// can list them without needing a dedicated "my joined events" backend table.
const KEY = 'facefind-joined-events';

export function getJoinedEventIds() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function addJoinedEventId(id) {
  const ids = getJoinedEventIds();
  if (!ids.includes(id)) {
    window.localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  }
}
