import { render, screen, waitFor } from '@testing-library/react';

import CoursePlayerPage from './page';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/TranslationProvider';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// --- Mocks ---
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/lib/i18n/TranslationProvider', () => ({
  useTranslation: vi.fn(),
}));

// Mock the grpc clients to prevent real network calls
vi.mock('@/lib/connect_client', () => ({
  getRpcClient: vi.fn().mockReturnValue({
    getCourseDetail: vi.fn().mockResolvedValue({ 
      course: { 
        id: 'course-123', 
        title: 'Mock Course',
        weekModules: [{ 
          lessons: [{ 
            items: [{ 
              id: 'item-1', 
              type: 1,
              interactiveTranscripts: [],
              inVideoQuizzes: []
            }] 
          }] 
        }] 
      } 
    }),
    getProgress: vi.fn().mockResolvedValue({ progress: null }),
    listPersonalNotes: vi.fn().mockResolvedValue({ notes: [] }),
  }),
}));

// Mock sub-components to isolate test to CoursePlayerPage logic
vi.mock('@/components/player/VideoPlayer', () => ({
  VideoPlayer: ({ userId }: { userId: string }) => <div data-testid="video-player" data-userid={userId}>VideoPlayer</div>
}));
vi.mock('@/components/player/TranscriptPanel', () => ({ TranscriptPanel: () => <div>TranscriptPanel</div> }));
vi.mock('@/components/player/NotesPanel', () => ({ NotesPanel: () => <div>NotesPanel</div> }));
vi.mock('@/components/player/DeadlinesPanel', () => ({ DeadlinesPanel: () => <div>DeadlinesPanel</div> }));
vi.mock('@/components/player/ForumTab', () => ({ ForumTab: () => <div>ForumTab</div> }));
vi.mock('@/components/providers/ThemeToggle', () => ({ ThemeToggle: () => <div>ThemeToggle</div> }));
vi.mock('@/components/providers/LanguageToggle', () => ({ LanguageToggle: () => <div>LanguageToggle</div> }));
vi.mock('@/components/course/CourseCompletionModal', () => ({ CourseCompletionModal: () => <div>CourseCompletionModal</div> }));

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
