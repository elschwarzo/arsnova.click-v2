import { isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { RxStompService } from '@stomp/ng2-stompjs';
import { RxStompState } from '@stomp/rx-stomp';
import { SimpleMQ } from 'ng2-simple-mq';
import { ReplaySubject } from 'rxjs';
import { MessageProtocol } from '../../lib/enums/Message';
import { IMessage } from '../../lib/interfaces/communication/IMessage';
import { StatisticsApiService } from '../api/statistics/statistics-api.service';
import { SharedService } from '../shared/shared.service';

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  public readonly dataEmitter: ReplaySubject<IMessage> = new ReplaySubject<IMessage>();

  private _serverAvailable: boolean;

  get serverAvailable(): boolean {
    return this._serverAvailable;
  }

  set serverAvailable(value: boolean) {
    this._serverAvailable = value;
  }

  private _websocketAvailable = false;

  get websocketAvailable(): boolean {
    return this._websocketAvailable;
  }

  set websocketAvailable(value: boolean) {
    this._websocketAvailable = value;
  }

  private _serverStatusEmitter = new ReplaySubject<boolean>(1);

  get serverStatusEmitter(): ReplaySubject<boolean> {
    return this._serverStatusEmitter;
  }

  private _rtt = 0;

  get rtt(): number {
    return this._rtt;
  }

  private _lowSpeed = false;

  get lowSpeed(): boolean {
    return this._lowSpeed;
  }

  private _mediumSpeed = false;

  get mediumSpeed(): boolean {
    return this._mediumSpeed;
  }

  private _pending = false;

  get pending(): boolean {
    return this._pending;
  }

  set pending(value: boolean) {
    this._pending = value;
  }

  private _isWebSocketAuthorized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private sharedService: SharedService,
    private statisticsApiService: StatisticsApiService,
    private rxStompService: RxStompService,
    private messageQueue: SimpleMQ,
  ) {
    this.initWebsocket();
  }

  public cleanUp(): void {
    this._isWebSocketAuthorized = false;
  }

  public initConnection(overrideCurrentState?: boolean): Promise<any> {
    if (isPlatformServer(this.platformId)) {
      return new Promise<any>(resolve => resolve());
    }

    return new Promise(async (resolve) => {
      if ((
            this.pending || this.serverAvailable
          ) && !overrideCurrentState) {
        resolve();
        return;
      }
      this.pending = true;
      const data = await new Promise(resolve2 => {
        this.statisticsApiService.getBaseStatistics().subscribe(httpData => {
          this.pending = false;
          this.serverAvailable = true;
          setTimeout(() => {
            this.calculateRTT(new Date().getTime());
          }, 500);
          resolve2(httpData);
        }, () => {
          this.pending = false;
          this.serverAvailable = false;
          resolve2();
        });
      });
      resolve(data);
    });
  }

  public calculateRTT(startTime = new Date().getTime()): void {
    this.statisticsApiService.optionsBaseStatistics().subscribe(() => {
      this.serverAvailable = true;
      this._rtt = new Date().getTime() - startTime;
      this.calculateConnectionSpeedIndicator();
    }, () => {
      this.serverAvailable = false;
    });
  }

  public initWebsocket(): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.connectToGlobalChannel();

    this.rxStompService.connectionState$.subscribe(value => {
      switch (value) {
        case RxStompState.OPEN:
          this._websocketAvailable = true;
          this._serverAvailable = true;
          this._serverStatusEmitter.next(true);
          break;
        case RxStompState.CLOSED:
          this._websocketAvailable = false;
          this._serverAvailable = false;
          this._serverStatusEmitter.next(false);
          break;
      }
    });
  }

  private calculateConnectionSpeedIndicator(): void {
    if (this._rtt > 800) {
      this._lowSpeed = true;
      this._mediumSpeed = false;
    } else if (this._rtt > 300) {
      this._lowSpeed = false;
      this._mediumSpeed = true;
    } else {
      this._lowSpeed = false;
      this._mediumSpeed = false;
    }
  }

  private connectToGlobalChannel(): void {
    this.rxStompService.watch(encodeURI(`/exchange/global`)).subscribe(message => {
      console.log('Message in global channel received', message);
      try {
        const parsedMessage = JSON.parse(message.body);
        switch (parsedMessage.step) {
          case MessageProtocol.SetActive:
            if (!this.sharedService.activeQuizzes.includes(parsedMessage.payload.quizName)) {
              this.sharedService.activeQuizzes.push(parsedMessage.payload.quizName);
            }
            break;
          case MessageProtocol.SetInactive:
            const index = this.sharedService.activeQuizzes.indexOf(parsedMessage.payload.quizName);
            if (index > -1) {
              this.sharedService.activeQuizzes.splice(index, 1);
            }
            break;
          default:
            this.messageQueue.publish(parsedMessage.step, parsedMessage.payload || {}, false);
            break;
        }
      } catch (ex) {
        console.error('Invalid message received', ex);
      }
    });
  }
}
