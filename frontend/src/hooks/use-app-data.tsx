'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  deleteDocument,
  getChatQuota,
  getDemoLimits,
  getReadyHealth,
  listDocuments,
  listSessions,
  uploadDocument,
  type DemoLimits,
  type DocumentRecord,
  type SessionRecord,
} from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

type AppDataContextValue = {
  documents: DocumentRecord[];
  sessions: SessionRecord[];
  selectedDocumentId: string | null;
  activeSessionId: string | null;
  loadingDocuments: boolean;
  loadingSessions: boolean;

  demoLimits: DemoLimits | null;
  demoMessage: string;
  retrievalMode: 'fts' | 'vector' | null;
  repositoryUrl: string;
  runLocallyGuideUrl: string;

  readyStatus: { database: boolean; ai: boolean; checked: boolean };
  chatQuota: { used: number; remaining: number; limit: number } | null;

  setSelectedDocumentId: (documentId: string | null) => void;
  setActiveSessionId: (sessionId: string | null) => void;
  refreshDocuments: () => Promise<void>;
  refreshSessions: (documentId?: string | null) => Promise<void>;
  refreshHealthAndLimits: () => Promise<void>;
  refreshChatQuota: () => Promise<void>;
  uploadDocumentFile: (file: File, onProgress?: (progress: number) => void) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

const DEFAULT_REPOSITORY_URL = 'https://github.com/saahilpal/RAG-DOCAnalyzer';

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [demoLimits, setDemoLimits] = useState<DemoLimits | null>(null);
  const [demoMessage, setDemoMessage] = useState(
    'This public demo runs on free-tier AI APIs, so usage limits apply.',
  );
  const [retrievalMode, setRetrievalMode] = useState<'fts' | 'vector' | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState(DEFAULT_REPOSITORY_URL);
  const [runLocallyGuideUrl, setRunLocallyGuideUrl] = useState(`${DEFAULT_REPOSITORY_URL}#run-locally`);

  const [readyStatus, setReadyStatus] = useState({ database: false, ai: false, checked: false });
  const [chatQuota, setChatQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);

  const refreshDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setSessions([]);
      setSelectedDocumentId(null);
      setActiveSessionId(null);
      return;
    }

    setLoadingDocuments(true);
    try {
      const data = await listDocuments();
      setDocuments(data.documents);

      setSelectedDocumentId((current) => {
        if (current && data.documents.some((document) => document.id === current)) {
          return current;
        }

        return data.documents[0]?.id || null;
      });
    } finally {
      setLoadingDocuments(false);
    }
  }, [user]);

  const refreshSessions = useCallback(
    async (documentIdFilter?: string | null) => {
      if (!user) {
        setSessions([]);
        setActiveSessionId(null);
        return;
      }

      setLoadingSessions(true);
      try {
        const data = await listSessions(documentIdFilter || undefined);
        setSessions(data.sessions);

        setActiveSessionId((current) => {
          if (current && data.sessions.some((session) => session.id === current)) {
            return current;
          }
          return null;
        });
      } finally {
        setLoadingSessions(false);
      }
    },
    [user],
  );

  const refreshHealthAndLimits = useCallback(async () => {
    const [limitsResult, readyResult] = await Promise.allSettled([getDemoLimits(), getReadyHealth()]);

    if (limitsResult.status === 'fulfilled') {
      setDemoLimits(limitsResult.value.limits);
      setDemoMessage(limitsResult.value.philosophy);
      setRetrievalMode(limitsResult.value.retrievalMode);
      setRepositoryUrl(limitsResult.value.links.githubRepositoryUrl || DEFAULT_REPOSITORY_URL);
      setRunLocallyGuideUrl(
        limitsResult.value.links.runLocallyGuideUrl || `${DEFAULT_REPOSITORY_URL}#run-locally`,
      );
    }

    if (readyResult.status === 'fulfilled') {
      setReadyStatus({
        database: readyResult.value.database,
        ai: readyResult.value.ai,
        checked: true,
      });
    } else {
      setReadyStatus({
        database: false,
        ai: false,
        checked: true,
      });
    }
  }, []);

  const refreshChatQuota = useCallback(async () => {
    if (!user) {
      setChatQuota(null);
      return;
    }

    try {
      const data = await getChatQuota();
      setChatQuota(data.quota);
    } catch {
      setChatQuota(null);
    }
  }, [user]);

  useEffect(() => {
    refreshDocuments().catch(() => {
      setDocuments([]);
      setSessions([]);
      setSelectedDocumentId(null);
      setActiveSessionId(null);
    });
  }, [refreshDocuments]);

  useEffect(() => {
    refreshSessions(selectedDocumentId).catch(() => {
      setSessions([]);
      setActiveSessionId(null);
    });
  }, [refreshSessions, selectedDocumentId]);

  useEffect(() => {
    refreshHealthAndLimits().catch(() => {
      setReadyStatus({ database: false, ai: false, checked: true });
    });
  }, [refreshHealthAndLimits]);

  useEffect(() => {
    refreshChatQuota().catch(() => {
      setChatQuota(null);
    });
  }, [refreshChatQuota]);

  const uploadDocumentFile = useCallback(
    async (file: File, onProgress?: (progress: number) => void) => {
      const uploaded = await uploadDocument(file, onProgress);
      await refreshDocuments();
      await refreshChatQuota();
      setSelectedDocumentId(uploaded.document.id);
      setActiveSessionId(null); // New document starts with a fresh session
      await refreshSessions(uploaded.document.id);
    },
    [refreshChatQuota, refreshDocuments, refreshSessions],
  );

  const removeDocument = useCallback(
    async (documentId: string) => {
      await deleteDocument(documentId);
      await refreshDocuments();
      await refreshChatQuota();
    },
    [refreshChatQuota, refreshDocuments],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      documents,
      sessions,
      selectedDocumentId,
      activeSessionId,
      loadingDocuments,
      loadingSessions,
      demoLimits,
      demoMessage,
      retrievalMode,
      repositoryUrl,
      runLocallyGuideUrl,
      readyStatus,
      chatQuota,
      setSelectedDocumentId,
      setActiveSessionId,
      refreshDocuments,
      refreshSessions,
      refreshHealthAndLimits,
      refreshChatQuota,
      uploadDocumentFile,
      removeDocument,
    }),
    [
      activeSessionId,
      chatQuota,
      demoLimits,
      demoMessage,
      documents,
      loadingDocuments,
      loadingSessions,
      readyStatus,
      refreshChatQuota,
      refreshDocuments,
      refreshHealthAndLimits,
      refreshSessions,
      removeDocument,
      repositoryUrl,
      retrievalMode,
      runLocallyGuideUrl,
      selectedDocumentId,
      sessions,
      uploadDocumentFile,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return context;
}
