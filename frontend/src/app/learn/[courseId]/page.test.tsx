import { render, screen, waitFor } from '@testing-library/react';
import CoursePlayerPage from './page';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/TranslationProvider';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// --- Mocks: Navigation & i18n ---
vi.mock('next/navigation', () => ({ useRouter: vi.fn(), useParams: vi.fn() }));
vi.mock('@/lib/i18n/TranslationProvider', () => ({ useTranslation: vi.fn() }));

// --- Mock: RPC client (bare minimum) ---
vi.mock('@/lib/connect_client', () => ({
  getRpcClient: vi.fn().mockReturnValue({
    getCourseDetail: vi.fn().mockResolvedValue({ course: { id: 'c1', weekModules: [{ lessons: [{ items: [{ id: 'i1', type: 1, interactiveTranscripts: [] }] }] }] } }),
    getProgress: vi.fn().mockResolvedValue({}),
    listPersonalNotes: vi.fn().mockResolvedValue({ notes: [] }),
  }),
}));

// --- Mock: Sub-components (stub to isolate page logic) ---
vi.mock('@/components/player/VideoPlayer', () => ({
  VideoPlayer: ({ userId }: { userId: string }) => <div data-testid="video-player" data-userid={userId} />,
}));
vi.mock('@/components/player/TranscriptPanel', () => ({ TranscriptPanel: () => null }));
vi.mock('@/components/player/NotesPanel', () => ({ NotesPanel: () => null }));
vi.mock('@/components/player/DeadlinesPanel', () => ({ DeadlinesPanel: () => null }));
vi.mock('@/components/player/ForumTab', () => ({ ForumTab: () => null }));
vi.mock('@/components/providers/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/providers/LanguageToggle', () => ({ LanguageToggle: () => null }));
vi.mock('@/components/course/CourseCompletionModal', () => ({ CourseCompletionModal: () => null }));

describe('CoursePlayerPage Authentication & UserId', () => {
  const mockRouterPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ push: mockRouterPush });
    (useParams as Mock).mockReturnValue({ courseId: 'course-123' });
    (useTranslation as Mock).mockReturnValue({ t: (key: string) => key });
    
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it('redirects to login if access_token is missing', () => {
    render(<CoursePlayerPage />);
    
    expect(mockRouterPush).toHaveBeenCalledWith('/auth/login?redirect=/learn/course-123');
  });

  it('reads user_id from localStorage and passes it to VideoPlayer when authenticated', async () => {
    // Setup authenticated state
    window.localStorage.setItem('access_token', 'valid-token');
    window.localStorage.setItem('user_id', 'test_user_789');

    render(<CoursePlayerPage />);

    // Should not redirect
    expect(mockRouterPush).not.toHaveBeenCalled();

    // Verify that VideoPlayer received the correct userId prop from localStorage
    await waitFor(() => {
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-userid', 'test_user_789');
    });
  });

  it('passes empty string to VideoPlayer if access_token exists but user_id is missing in localStorage', async () => {
    // Setup authenticated state but missing user_id
    window.localStorage.setItem('access_token', 'valid-token');
    // Deliberately not setting 'user_id'

    render(<CoursePlayerPage />);

    expect(mockRouterPush).not.toHaveBeenCalled();

    await waitFor(() => {
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('data-userid', '');
    });
  });
});
