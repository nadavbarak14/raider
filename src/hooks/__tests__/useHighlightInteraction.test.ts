import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlightInteraction } from '../useHighlightInteraction';

// Mock the storage module since it depends on IndexedDB
vi.mock('@/lib/storage/threads', () => ({
  getThreadsForBook: vi.fn().mockResolvedValue([]),
}));

describe('useHighlightInteraction', () => {
  it('starts with no selection and panels closed', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    expect(result.current.highlightMenuVisible).toBe(false);
    expect(result.current.threadPanelOpen).toBe(false);
    expect(result.current.selectedText).toBe('');
    expect(result.current.selectedCfi).toBe('');
    expect(result.current.selection).toBeNull();
  });

  it('handleTextSelected sets selection state and shows menu', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    act(() => {
      result.current.handleTextSelected(
        'epubcfi(/6/4)',
        'Hello world',
        new DOMRect(100, 200, 50, 20)
      );
    });

    expect(result.current.highlightMenuVisible).toBe(true);
    expect(result.current.selectedText).toBe('Hello world');
    expect(result.current.selectedCfi).toBe('epubcfi(/6/4)');
    expect(result.current.selection).not.toBeNull();
    expect(result.current.selection?.position.x).toBe(125); // 100 + 50/2
    expect(result.current.selection?.position.y).toBe(200);
  });

  it('ignores empty text selection', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    act(() => {
      result.current.handleTextSelected(
        'epubcfi(/6/4)',
        '   ',
        new DOMRect(100, 200, 50, 20)
      );
    });

    expect(result.current.highlightMenuVisible).toBe(false);
    expect(result.current.selectedText).toBe('');
  });

  it('handleHighlightAction opens thread panel and closes highlight menu', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    // First select text
    act(() => {
      result.current.handleTextSelected(
        'epubcfi(/6/4)',
        'Test text',
        new DOMRect(100, 200, 50, 20)
      );
    });
    expect(result.current.highlightMenuVisible).toBe(true);

    // Then trigger an action
    act(() => {
      result.current.handleHighlightAction('explain');
    });

    expect(result.current.highlightMenuVisible).toBe(false);
    expect(result.current.threadPanelOpen).toBe(true);
    expect(result.current.activeQuestionType).toBe('explain');
    expect(result.current.activeAnchorText).toBe('Test text');
  });

  it('dismissHighlightMenu closes the menu', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    act(() => {
      result.current.handleTextSelected(
        'epubcfi(/6/4)',
        'Test',
        new DOMRect(100, 200, 50, 20)
      );
    });
    expect(result.current.highlightMenuVisible).toBe(true);

    act(() => {
      result.current.dismissHighlightMenu();
    });
    expect(result.current.highlightMenuVisible).toBe(false);
  });

  it('handleOpenGeneralChat opens thread panel in general mode', () => {
    const { result } = renderHook(() => useHighlightInteraction('book1'));

    act(() => {
      result.current.handleOpenGeneralChat();
    });

    expect(result.current.threadPanelOpen).toBe(true);
    expect(result.current.activeQuestionType).toBe('general');
    expect(result.current.activeAnchorText).toBeUndefined();
    expect(result.current.activeAnchorCfi).toBeUndefined();
  });
});
