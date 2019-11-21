import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable } from '@angular/core';
import { captureException, Event as SentryEvent, init as SentryInit, setExtra, showReportDialog } from '@sentry/browser';
import { EventHint } from '@sentry/types';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SentryErrorHandler implements ErrorHandler {
  private readonly _enabled = !!environment.sentryDSN;

  constructor() {
    if (!environment.sentryDSN) {
      return;
    }

    SentryInit({
      dsn: environment.sentryDSN,
      enabled: this._enabled,
      release: environment.version,
      beforeSend(event: SentryEvent, hint?: EventHint): PromiseLike<SentryEvent | null> | SentryEvent | null {
        if (event.exception.values.some(val => !val.mechanism.handled)) {
          console.log('sending error event', event, hint);
          return event;
        }
        return null;
      },
    });

    setExtra('nonErrorException', false);
  }

  public handleError(error): void {
    if (!this._enabled || error instanceof HttpErrorResponse) {
      return;
    }

    console.log('error occured', error);
    const eventId = captureException(error.originalError || error);
    showReportDialog({ eventId });
  }
}
