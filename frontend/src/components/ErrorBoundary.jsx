import React from 'react';

/**
 * The last line, and the only one that catches what nothing else can.
 *
 * WHY THIS EXISTS. Three times in this project a component has referenced
 * something undefined, built cleanly, and taken a page down to a white
 * screen: Bell in the shell, EmptyState in the inbox, Wordmark on sign-up.
 * There is now a check that catches that class before it ships, but a check
 * only catches what it knows to look for. A null where an object was
 * expected, a malformed response, a browser API that is missing — none of
 * those are caught by anything, and every one of them ends the same way: a
 * blank page with no route out, which is the single worst thing that can
 * happen while somebody is being shown this.
 *
 * IT CHANGES NOTHING WHEN NOTHING IS WRONG. React calls this only after a
 * descendant has already thrown. On a working day every line here is dead
 * code, which is the entire design: error-proofing must not become the
 * damage it is meant to prevent.
 *
 * It offers the two things that actually recover a React app — reload the
 * route, or leave for a page known to work — rather than apologising.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, message: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    // Kept in the console rather than swallowed: whoever is debugging this
    // at midnight needs the stack, and there is nowhere else for it to go.
    console.error('Caught by the error boundary:', error, info?.componentStack);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#F6F6F7' }}>
        <div className="bg-white rounded-2xl border border-surface-border max-w-[520px] w-full px-9 py-10 text-center">
          <div className="w-11 h-11 rounded-xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: '#FDF1EF' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C85A4A" strokeWidth="1.75" strokeLinecap="round">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
          </div>

          <p className="text-[17px] font-semibold text-ink-950 mb-2">This page stopped working.</p>
          <p className="text-[14px] text-ink-700 leading-relaxed mb-1">
            Nothing has been lost. Everything you have done is saved, and the rest of the
            product is unaffected.
          </p>
          <p className="text-[13px] text-ink-500 leading-relaxed mb-7">
            Reloading fixes almost all of these.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-ink-900 hover:bg-ink-700 text-white px-5 py-2.5 rounded-full text-[14px] font-medium transition-colors"
            >
              Reload this page
            </button>
            {/* A hard navigation rather than a router push: the router is
                inside the tree that just failed, and asking it to move is how
                a recoverable crash becomes a permanent one. */}
            <button
              onClick={() => { window.location.href = '/app'; }}
              className="text-[14px] text-ink-500 hover:text-ink-900 transition-colors"
            >
              Go to your dashboard
            </button>
          </div>

          {this.state.message && (
            <p className="text-[11.5px] text-ink-300 mt-7 font-mono break-words">{this.state.message}</p>
          )}
        </div>
      </div>
    );
  }
}
