'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0514',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <AlertOctagon size={64} color="#ff4444" style={{ marginBottom: '1.5rem' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong.</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '500px', marginBottom: '2rem' }}>
            We've encountered an unexpected error. Our team has been notified.
            <br/><br/>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#ff4444' }}>
              {this.state.errorMsg}
            </span>
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--accent-primary, #00e676)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Return to Lobby
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
