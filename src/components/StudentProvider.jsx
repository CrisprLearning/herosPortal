import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { getMe } from '../lib/parentApi';
import {
  getCachedParent, setCachedParent, getSelectedChildId, setSelectedChildId, isAuthenticated,
} from '../lib/auth';

/**
 * Holds the logged-in parent, their children, and which child is currently
 * being viewed. Every page reads `child` from here and re-fetches when it
 * changes, so the top-right switcher drives the whole portal.
 */
const StudentContext = createContext(null);

export function useStudent() {
  return useContext(StudentContext);
}

export default function StudentProvider({ children: content }) {
  const cached = getCachedParent();
  const [parent, setParent] = useState(cached?.parent ?? null);
  const [kids, setKids] = useState(cached?.children ?? []);
  const [selectedId, setSelectedId] = useState(getSelectedChildId());
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    setError('');
    try {
      const me = await getMe();
      setParent(me.parent);
      setKids(me.children || []);
      setCachedParent({ parent: me.parent, children: me.children || [] });
    } catch (e) {
      setError(e?.message || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Resolve the selected child: honour the stored choice if it still exists,
  // otherwise fall back to the first child.
  const child = useMemo(() => {
    if (!kids.length) return null;
    return kids.find((k) => String(k.id) === String(selectedId)) || kids[0];
  }, [kids, selectedId]);

  useEffect(() => {
    if (child && String(child.id) !== String(selectedId)) {
      setSelectedId(String(child.id));
      setSelectedChildId(child.id);
    }
  }, [child, selectedId]);

  // Replace the parent object after a profile edit and keep the cache in sync.
  const updateParent = useCallback((next) => {
    setParent(next);
    setKids((current) => {
      setCachedParent({ parent: next, children: current });
      return current;
    });
  }, []);

  const selectChild = useCallback((id) => {
    setSelectedId(String(id));
    setSelectedChildId(id);
  }, []);

  const value = useMemo(() => ({
    parent, children: kids, child, selectChild, updateParent, loading, error, refresh,
  }), [parent, kids, child, selectChild, updateParent, loading, error, refresh]);

  return <StudentContext.Provider value={value}>{content}</StudentContext.Provider>;
}

/**
 * Fetch something for the currently selected child. Re-runs whenever the
 * child changes and ignores stale responses from a previous child.
 */
export function useChildData(fetcher) {
  const { child } = useStudent() || {};
  const childId = child?.id;
  const [state, setState] = useState({ data: null, loading: Boolean(childId), error: '' });

  useEffect(() => {
    if (!childId) return undefined;
    let alive = true;
    setState({ data: null, loading: true, error: '' });
    fetcher(childId)
      .then((data) => { if (alive) setState({ data, loading: false, error: '' }); })
      .catch((e) => { if (alive) setState({ data: null, loading: false, error: e?.message || 'Something went wrong.' }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  return { ...state, child };
}
