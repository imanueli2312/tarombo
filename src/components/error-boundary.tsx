"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[50vh] place-items-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-destructive/10">
              <svg
                className="size-7 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold">Terjadi Kesalahan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error?.message || "Halaman ini mengalami error tak terduga."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Muat Ulang Halaman
              </Button>
              <Button onClick={() => this.setState({ hasError: false, error: undefined })}>
                Coba Lagi
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
