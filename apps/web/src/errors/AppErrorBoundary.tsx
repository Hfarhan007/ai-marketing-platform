import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorReporter } from '../observability';
import { ErrorFallback } from './ErrorFallback';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    errorReporter.capture(error, {
      boundary: 'application',
      ...(info.componentStack ? { componentStack: info.componentStack } : {}),
    });
  }

  override render() {
    return this.state.error ? (
      <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />
    ) : (
      this.props.children
    );
  }
}
