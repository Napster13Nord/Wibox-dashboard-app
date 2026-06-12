"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Ingredient, Recipe, Dish, Folder } from './types';
import { newId } from './utils';
import { LoadingScreen } from '@/components/LoadingScreen';
import {
  AppState, defaultState, migrateState, patchById, getLocale,
  apiPost, apiPatch, apiDelete, apiPatchTranslation, syncFullState,
  saveToLocalStorage, readCachedState,
} from './persistence';

type AppContextType = {
  state: AppState;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (id: string, ingredient: Partial<Ingredient>) => void;
  deleteIngredient: (id: string) => void;

  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;

  addDish: (dish: Dish) => void;
  updateDish: (id: string, dish: Partial<Dish>) => void;
  deleteDish: (id: string) => void;

  addFolder: (type: 'recipe' | 'dish', folder: Folder) => void;
  updateFolder: (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => void;
  deleteFolder: (type: 'recipe' | 'dish', id: string) => void;

  restoreFromTrash: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;

  updateTranslations: (entityType: 'ingredient' | 'recipe' | 'dish' | 'folder', entityId: string, translations: Record<string, string>) => void;

  undo: () => void;
  canUndo: boolean;

  // ── Server sync status ──
  syncError: boolean;       // true when a write to the server failed
  isSyncing: boolean;       // true while a manual re-sync is in flight
  retrySync: () => void;    // push the full local state to the server again
};

const MAX_UNDO = 20;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clerk auth gate — never load data or show the skeleton until the user is
  // actually signed in, otherwise the provider (which wraps every page incl.
  // /sign-in) would render the skeleton over the login form and burn its
  // retries against redirected requests.
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  // Seed from cache so a returning user renders instantly (no skeleton); the
  // skeleton is reserved for the first login, when there's nothing cached yet.
  const [bootCache] = useState(readCachedState);
  const [state, setState] = useState<AppState>(bootCache ?? defaultState);
  const [isLoaded, setIsLoaded] = useState<boolean>(bootCache !== null);
  const [history, setHistory] = useState<AppState[]>([]);
  const [syncError, setSyncError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Number of server writes currently in flight. The focus/online reconcile
  // uses it to avoid overwriting local edits the server hasn't confirmed yet.
  const pendingWritesRef = useRef(0);

  // Watch a critical save promise; flag a visible sync error if it rejects.
  const track = (p: Promise<unknown> | void) => {
    if (!p || typeof (p as Promise<unknown>).then !== 'function') return;
    pendingWritesRef.current++;
    (p as Promise<unknown>).then(
      () => { pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1); },
      (err: unknown) => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
        console.error('[Wibox] save to server failed:', err);
        setSyncError(true);
      },
    );
  };

  // A ref that always holds the latest state — used so doUpdate can
  // read the current state synchronously without stale closures.
  const stateRef = useRef<AppState>(defaultState);

  // Keep ref in sync with state after every render
  stateRef.current = state;

  // ── Load on mount: normalized tables → legacy blob → localStorage ──
  // The first request after a cold start can transiently fail (serverless and
  // Neon warming up), which previously left the app blank until a manual
  // refresh. Retry the primary endpoint a few times with backoff so it
  // self-heals; the LoadingScreen keeps showing meanwhile.
  useEffect(() => {
    // Wait until Clerk confirms an authenticated session before fetching —
    // requests made while signed out are redirected to /sign-in (302 → HTML)
    // and would needlessly exhaust the retry budget.
    if (!authLoaded || !isSignedIn) return;

    let cancelled = false;

    const applyState = (next: AppState) => {
      if (cancelled) return;
      setState(next);
      stateRef.current = next;
      // Cache the freshly-loaded state so the next refresh seeds from it and
      // skips the skeleton (previously the cache was only written on edits).
      saveToLocalStorage(next);
    };

    // Returns the migrated state, or null on a reachable-but-empty response.
    // Throws on a non-ok response / network error so the caller can retry.
    const fetchPrimary = async (): Promise<AppState | null> => {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(`GET /api/state failed (${res.status})`);
      const data = await res.json();
      if (data && typeof data === 'object' && (data.ingredients || data.recipes || data.dishes)) {
        return migrateState(data);
      }
      return null;
    };

    const load = async () => {
      const RETRY_DELAYS = [400, 900, 1500]; // ms backoff between primary attempts

      for (let attempt = 0; attempt <= RETRY_DELAYS.length && !cancelled; attempt++) {
        try {
          const primary = await fetchPrimary();
          if (primary) {
            applyState(primary);
            if (!cancelled) setIsLoaded(true);
            return;
          }
          break; // server reachable but no data → try the other sources
        } catch {
          // transient cold-start / network failure — back off and retry
          if (attempt < RETRY_DELAYS.length) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
          }
        }
      }
      if (cancelled) return;

      // Fallback: legacy blob endpoint
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object' && (data.ingredients || data.recipes || data.dishes)) {
            applyState(migrateState(data));
            if (!cancelled) setIsLoaded(true);
            return;
          }
        }
      } catch { /* ignore */ }

      // Last fallback: localStorage
      try {
        const saved = localStorage.getItem('wibox-data');
        if (saved) applyState(migrateState(JSON.parse(saved)));
      } catch { /* ignore */ }

      if (!cancelled) setIsLoaded(true);
    };

    load();
    return () => { cancelled = true; };
  }, [authLoaded, isSignedIn]);

  // ── Heal on focus / reconnect ──
  // A granular write can fail silently between full syncs, leaving the server
  // behind local state — or another device may have changed things. When the
  // tab regains focus or the network comes back, refetch the canonical state
  // and reconcile. Skip while writes are in flight or a sync error is pending
  // (local state is the source of truth then — the retry banner handles it),
  // so we never clobber un-synced local edits.
  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;

    let cancelled = false;

    const reconcile = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (pendingWritesRef.current > 0 || syncError) return;
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data || typeof data !== 'object' || !(data.ingredients || data.recipes || data.dishes)) return;
        // Re-check the guards after the await — an edit may have started meanwhile.
        if (cancelled || pendingWritesRef.current > 0 || syncError) return;
        const migrated = migrateState(data);
        setState(migrated);
        stateRef.current = migrated;
        saveToLocalStorage(migrated);
      } catch { /* offline / transient — ignore, we'll try again next focus */ }
    };

    const onVisibility = () => { if (document.visibilityState === 'visible') reconcile(); };
    window.addEventListener('online', reconcile);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('online', reconcile);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authLoaded, isSignedIn, syncError]);

  // ── Core update helper — computes new state, persists it, then sets it ──
  // apiAction: optional callback for the granular API call. If it returns a
  // promise, we track it so a failed server write surfaces a visible error.
  const doUpdate = (updater: (prev: AppState) => AppState, apiAction?: () => Promise<unknown> | void) => {
    // Read current state from ref (always fresh, no stale closures)
    const prev = stateRef.current;

    // Push to undo history
    setHistory(h => {
      const next = [...h, prev];
      if (next.length > MAX_UNDO) next.shift();
      return next;
    });

    // Compute new state
    const next = updater(prev);

    // Update ref immediately so rapid successive calls see each other's results
    stateRef.current = next;

    // Update React state (triggers re-render)
    setState(next);

    // Save to localStorage immediately (for undo/offline resilience)
    saveToLocalStorage(next);

    // Fire the granular API call (non-blocking) and track its outcome
    if (apiAction) {
      track(apiAction());
    }
  };

  // ── Undo ──
  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next.pop()!;
      stateRef.current = last;
      setState(last);
      saveToLocalStorage(last);
      // Full state sync for undo — ensures DB matches
      track(syncFullState(last));
      return next;
    });
  };

  const canUndo = history.length > 0;

  // ── Manual re-sync: push the whole local state to the server again ──
  // Used to recover after a failed write — local state is the source of truth.
  const retrySync = () => {
    setIsSyncing(true);
    syncFullState(stateRef.current)
      .then(() => setSyncError(false))
      .catch((err: unknown) => console.error('[Wibox] manual re-sync failed:', err))
      .finally(() => setIsSyncing(false));
  };

  // ── Entity CRUD factory ──
  // Ingredients / recipes / dishes share the same add / update / delete shape:
  // optimistic local change via doUpdate + a granular API write. The only
  // differences are which collection to touch, the API path, and the trash
  // `originalType`. `select`/`write` keep it fully typed (no dynamic-key casts).
  // Translation on create is server-side (POST route → translateAndSave); new
  // names refresh into state on the next load / focus reconcile.
  const makeCrud = <T extends Ingredient | Recipe | Dish>(
    select: (s: AppState) => T[],
    write: (s: AppState, items: T[]) => AppState,
    apiPath: string,
    trashType: 'ingredient' | 'recipe' | 'dish',
  ) => ({
    // doUpdate intentionally reads stateRef.current synchronously (the same
    // deliberate stale-closure-avoidance pattern flagged on `stateRef.current =
    // state` above). The factory is invoked during render, so the rule trips
    // here too — but the returned handlers are deferred event callbacks.
    // eslint-disable-next-line react-hooks/refs
    add: (item: T) => doUpdate(
      s => write(s, [...select(s), item]),
      () => apiPost(apiPath, { ...item, sourceLang: getLocale() }),
    ),
    update: (id: string, patch: Partial<T>) => doUpdate(
      s => write(s, patchById(select(s), id, patch)),
      () => apiPatch(apiPath, { id, ...patch }),
    ),
    remove: (id: string) => doUpdate(
      s => {
        const item = select(s).find(i => i.id === id);
        return {
          ...write(s, select(s).filter(i => i.id !== id)),
          trash: item
            ? [...s.trash, { id: newId(), originalType: trashType, data: item, deletedAt: new Date().toISOString() }]
            : s.trash,
        };
      },
      () => apiDelete(`${apiPath}?id=${id}`),
    ),
  });

  const { add: addIngredient, update: updateIngredient, remove: deleteIngredient } =
    makeCrud<Ingredient>(s => s.ingredients, (s, ingredients) => ({ ...s, ingredients }), '/api/ingredients', 'ingredient');
  const { add: addRecipe, update: updateRecipe, remove: deleteRecipe } =
    makeCrud<Recipe>(s => s.recipes, (s, recipes) => ({ ...s, recipes }), '/api/recipes', 'recipe');
  const { add: addDish, update: updateDish, remove: deleteDish } =
    makeCrud<Dish>(s => s.dishes, (s, dishes) => ({ ...s, dishes }), '/api/dishes', 'dish');

  // ── Folders ──
  const addFolder = (type: 'recipe' | 'dish', folder: Folder) => {
    const sourceLang = getLocale();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    doUpdate(
      s => ({ ...s, [key]: [...(s[key] || []), folder] }),
      () => apiPost('/api/folders', { type, sourceLang, ...folder }),
    );
  };

  const updateFolder = (type: 'recipe' | 'dish', id: string, folder: Partial<Folder>) => {
    const sourceLang = getLocale();
    const key = type === 'recipe' ? 'recipeFolders' : 'dishFolders';
    // Server re-translates on name change (PATCH /api/folders → translateAndSave).
    doUpdate(
      s => ({
        ...s,
        [key]: (s[key] || []).map((f: Folder) => f.id === id ? { ...f, ...folder } : f),
      }),
      () => apiPatch('/api/folders', { id, sourceLang, ...folder }),
    );
  };

  const deleteFolder = (type: 'recipe' | 'dish', id: string) => {
    doUpdate(
      s => type === 'recipe'
        ? {
            ...s,
            recipeFolders: s.recipeFolders.filter(f => f.id !== id),
            recipes: s.recipes.map(r => r.folder === id ? { ...r, folder: '' } : r),
          }
        : {
            ...s,
            dishFolders: s.dishFolders.filter(f => f.id !== id),
            dishes: s.dishes.map(d => d.folder === id ? { ...d, folder: '' } : d),
          },
      () => apiDelete(`/api/folders?id=${id}&type=${type}`),
    );
  };

  // ── Trash ──
  const restoreFromTrash = (id: string) => {
    // Capture the trash item up front — by the time the apiAction runs, doUpdate
    // has already removed it from state, so looking it up there finds nothing and
    // the server restore (un-delete) would silently never fire, letting the next
    // focus/reconcile pull the still-deleted server row back over local state.
    const trashItem = stateRef.current.trash.find(t => t.id === id);
    doUpdate(
      s => {
        if (!trashItem) return s;
        const newState = { ...s, trash: s.trash.filter(t => t.id !== id) };
        switch (trashItem.originalType) {
          case 'ingredient':
            newState.ingredients = [...newState.ingredients, trashItem.data as Ingredient];
            break;
          case 'recipe':
            newState.recipes = [...newState.recipes, trashItem.data as Recipe];
            break;
          case 'dish':
            newState.dishes = [...newState.dishes, trashItem.data as Dish];
            break;
        }
        return newState;
      },
      () => trashItem
        ? apiPost('/api/trash', {
            entityType: trashItem.originalType,
            entityId: trashItem.data.id,
          })
        : undefined,
    );
  };

  const permanentlyDelete = (id: string) => {
    const trashItem = stateRef.current.trash.find(t => t.id === id);
    doUpdate(
      s => ({ ...s, trash: s.trash.filter(t => t.id !== id) }),
      () => {
        if (trashItem) {
          return apiDelete(`/api/trash?entityType=${trashItem.originalType}&entityId=${trashItem.data.id}`);
        }
      },
    );
  };

  const emptyTrash = () => {
    doUpdate(
      s => ({ ...s, trash: [] }),
      () => apiDelete('/api/trash?all=true'),
    );
  };

  // ── Translation editing ──
  const updateTranslations = (
    entityType: 'ingredient' | 'recipe' | 'dish' | 'folder',
    entityId: string,
    translations: Record<string, string>
  ) => {
    doUpdate(
      s => {
        if (entityType === 'ingredient') return { ...s, ingredients: patchById(s.ingredients, entityId, { translations }) };
        if (entityType === 'recipe') return { ...s, recipes: patchById(s.recipes, entityId, { translations }) };
        if (entityType === 'dish') return { ...s, dishes: patchById(s.dishes, entityId, { translations }) };
        // folder: live in either recipeFolders or dishFolders
        return s.recipeFolders.some(f => f.id === entityId)
          ? { ...s, recipeFolders: patchById(s.recipeFolders, entityId, { translations }) }
          : { ...s, dishFolders: patchById(s.dishFolders, entityId, { translations }) };
      },
      () => apiPatchTranslation(entityType, entityId, translations),
    );
  };

  const contextValue: AppContextType = {
    state,
    addIngredient, updateIngredient, deleteIngredient,
    addRecipe, updateRecipe, deleteRecipe,
    addDish, updateDish, deleteDish,
    addFolder, updateFolder, deleteFolder,
    restoreFromTrash, permanentlyDelete, emptyTrash,
    updateTranslations,
    undo, canUndo,
    syncError, isSyncing, retrySync,
  };

  // While Clerk initialises, render nothing (avoids flashing the skeleton over
  // the sign-in page). When signed out, the child is the public /sign-in page —
  // render it through the provider without the loading gate. Only once signed
  // in do we hold the skeleton until the user's data has loaded.
  if (!authLoaded) return null;

  let content: React.ReactNode = children;
  if (isSignedIn && !isLoaded) content = <LoadingScreen />;

  return <AppContext.Provider value={contextValue}>{content}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
