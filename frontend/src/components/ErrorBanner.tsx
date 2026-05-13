interface ErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="error-banner">
      <div className="error-banner__content">
        <span className="error-banner__icon">⚠️</span>
        <span className="error-banner__message">{error}</span>
        <button
          className="error-banner__close"
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
