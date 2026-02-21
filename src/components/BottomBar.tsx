"use client";

interface BottomBarProps {
  onNext: () => void;
  onUndo: () => void;
  onReset: () => void;
  canNext: boolean;
  canUndo: boolean;
  nextLabel?: string;
  showUndo?: boolean;
  showReset?: boolean;
  instruction?: string;
}

export function BottomBar({
  onNext,
  onUndo,
  onReset,
  canNext,
  canUndo,
  nextLabel = "Continue",
  showUndo = true,
  showReset = true,
  instruction,
}: BottomBarProps) {
  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
      {/* Instruction hint */}
      {instruction && (
        <p className="text-sm text-gray-500 text-center mb-3">{instruction}</p>
      )}

      <div className="flex items-center gap-3">
        {/* Undo */}
        {showUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors"
          >
            Undo
          </button>
        )}

        {/* Reset current step */}
        {showReset && (
          <button
            onClick={onReset}
            disabled={!canUndo}
            className="px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed active:bg-red-100 transition-colors"
          >
            Reset
          </button>
        )}

        {/* Continue */}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex-1 py-3 text-base font-semibold text-white bg-blue-600 rounded-xl disabled:bg-blue-300 disabled:cursor-not-allowed active:bg-blue-700 transition-colors"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
