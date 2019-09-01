import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, SecurityContext, TemplateRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { SimpleMQ } from 'ng2-simple-mq';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AutoUnsubscribe } from '../../../../lib/AutoUnsubscribe';
import { QuizEntity } from '../../../../lib/entities/QuizEntity';
import { StorageKey } from '../../../../lib/enums/enums';
import { MessageProtocol } from '../../../../lib/enums/Message';
import { QuizState } from '../../../../lib/enums/QuizState';
import { UserRole } from '../../../../lib/enums/UserRole';
import { FooterbarElement } from '../../../../lib/footerbar-element/footerbar-element';
import { IMessage } from '../../../../lib/interfaces/communication/IMessage';
import { IMemberSerialized } from '../../../../lib/interfaces/entities/Member/IMemberSerialized';
import { parseGithubFlavoredMarkdown } from '../../../../lib/markdown/markdown';
import { ServerUnavailableModalComponent } from '../../../modals/server-unavailable-modal/server-unavailable-modal.component';
import { MemberApiService } from '../../../service/api/member/member-api.service';
import { QuizApiService } from '../../../service/api/quiz/quiz-api.service';
import { AttendeeService } from '../../../service/attendee/attendee.service';
import { ConnectionService } from '../../../service/connection/connection.service';
import { FooterBarService } from '../../../service/footer-bar/footer-bar.service';
import { HeaderLabelService } from '../../../service/header-label/header-label.service';
import { QuizService } from '../../../service/quiz/quiz.service';
import { SharedService } from '../../../service/shared/shared.service';
import { ThemesService } from '../../../service/themes/themes.service';
import { TrackingService } from '../../../service/tracking/tracking.service';
import { UserService } from '../../../service/user/user.service';
import { EditModeConfirmComponent } from './modals/edit-mode-confirm/edit-mode-confirm.component';
import { QrCodeContentComponent } from './modals/qr-code-content/qr-code-content.component';

@Component({
  selector: 'app-quiz-lobby',
  templateUrl: './quiz-lobby.component.html',
  styleUrls: ['./quiz-lobby.component.scss'],
}) //
@AutoUnsubscribe('_subscriptions')
export class QuizLobbyComponent implements OnInit, OnDestroy {
  public static TYPE = 'QuizLobbyComponent';

  private _nickToRemove: string;

  get nickToRemove(): string {
    return this._nickToRemove;
  }

  private readonly _messageSubscriptions: Array<string> = [];
  private _serverUnavailableModal: NgbModalRef;
  private _reconnectTimeout: any;
  private _kickMemberModalRef: NgbActiveModal;
  // noinspection JSMismatchedCollectionQueryUpdate
  private readonly _subscriptions: Array<Subscription> = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public quizService: QuizService,
    public attendeeService: AttendeeService,
    private footerBarService: FooterBarService,
    private headerLabelService: HeaderLabelService,
    private themesService: ThemesService,
    private router: Router,
    private connectionService: ConnectionService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal,
    private trackingService: TrackingService,
    private memberApiService: MemberApiService,
    private quizApiService: QuizApiService,
    private ngbModal: NgbModal,
    private sharedService: SharedService,
    private userService: UserService, private messageQueue: SimpleMQ,
  ) {
    sessionStorage.removeItem(StorageKey.CurrentQuestionIndex);
    this.footerBarService.TYPE_REFERENCE = QuizLobbyComponent.TYPE;
  }

  public ngOnInit(): void {
    this._subscriptions.push(this.quizService.quizUpdateEmitter.subscribe(quiz => {
      console.log('QuizLobbyComponent: quizUpdateEmitter fired', quiz);
      if (!quiz) {
        return;
      }

      if (this.quizService.quiz.state === QuizState.Inactive) {
        this.router.navigate(['/']);
        return;
      }

      this.sharedService.isLoadingEmitter.next(false);
      if (this.quizService.isOwner) {
        console.log('QuizLobbyComponent: quiz for owner initialized', this.quizService.quiz);
        this.handleNewQuiz(this.quizService.quiz);
      } else {
        this.handleNewAttendee();
      }
    }));

    this.quizService.loadDataToPlay(sessionStorage.getItem(StorageKey.CurrentQuizName)).then(() => {
      this.handleMessages();
    });

    this._subscriptions.push(this.connectionService.serverStatusEmitter.subscribe(isConnected => {
      if (isConnected) {
        if (this._serverUnavailableModal) {
          this._serverUnavailableModal.dismiss();
        }
        return;
      } else if (!isConnected && this._serverUnavailableModal) {
        return;
      }

      this.ngbModal.dismissAll();
      this._serverUnavailableModal = this.ngbModal.open(ServerUnavailableModalComponent, {
        keyboard: false,
        backdrop: 'static',
      });
      this._serverUnavailableModal.result.finally(() => this._serverUnavailableModal = null);
    }));
  }

  public openKickMemberModal(content: TemplateRef<any>, name: string): void {
    if (!this.quizService.isOwner) {
      return;
    }

    this._kickMemberModalRef = this.modalService.open(content);
    this._nickToRemove = name;
  }

  public kickMember(name: string): void {
    this._kickMemberModalRef.close();
    this.memberApiService.deleteMember(this.quizService.quiz.name, name).subscribe();
  }

  public hexToRgb(hex): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  }

  public transformForegroundColor(rgbObj: { r: number, g: number, b: number }): string {
    const o = Math.round(((rgbObj.r * 299) + (rgbObj.g * 587) + (rgbObj.b * 114)) / 1000);
    return o < 125 ? 'ffffff' : '000000';
  }

  public sanitizeHTML(value: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, `${value}`);
  }

  public parseNickname(value: string): SafeHtml {

    if (value.match(/:[\w\+\-]+:/g)) {
      return this.sanitizeHTML(parseGithubFlavoredMarkdown(value));
    }
    return value;
  }

  public ngOnDestroy(): void {
    this._subscriptions.forEach(sub => sub.unsubscribe());
    this._messageSubscriptions.forEach(id => this.messageQueue.unsubscribe(id));
    this.footerBarService.footerElemStartQuiz.restoreClickCallback();
    this.footerBarService.footerElemBack.restoreClickCallback();
    clearTimeout(this._reconnectTimeout);
  }

  private handleNewQuiz(quiz: QuizEntity): void {
    console.log('QuizLobbyComponent: quiz initialized', quiz);
    if (!quiz) {
      return;
    }

    this.headerLabelService.headerLabel = this.quizService.quiz.name;

    this.trackingService.trackConversionEvent({ action: QuizLobbyComponent.TYPE });
    this.addFooterElementsAsOwner();
  }

  private addFooterElementsAsAttendee(): void {
    this.footerBarService.replaceFooterElements([
      this.footerBarService.footerElemBack,
    ]);
    this.footerBarService.footerElemBack.onClickCallback = async () => {
      this.memberApiService.deleteMember(this.quizService.quiz.name, this.attendeeService.ownNick).subscribe();
      this.attendeeService.cleanUp();
      this.connectionService.cleanUp();
      this.router.navigate(['/']);
    };
  }

  private addFooterElementsAsOwner(): void {
    const footerElements = [
      this.footerBarService.footerElemStartQuiz, this.footerBarService.footerElemQRCode,
    ];

    if (!environment.requireLoginToCreateQuiz || this.userService.isAuthorizedFor(UserRole.QuizAdmin)) {
      footerElements.splice(0, 0, this.footerBarService.footerElemEditQuiz);
    }

    if (environment.readingConfirmationEnabled) {
      footerElements.splice(2, 0, this.footerBarService.footerElemReadingConfirmation);
    }

    if (environment.confidenceSliderEnabled) {
      footerElements.push(this.footerBarService.footerElemConfidenceSlider);
    }

    this.footerBarService.replaceFooterElements(footerElements);

    this.addFooterElemClickCallbacksAsOwner();
  }

  private addFooterElemClickCallbacksAsOwner(): void {
    this.footerBarService.footerElemStartQuiz.onClickCallback = (self: FooterbarElement) => {
      if (!this.attendeeService.attendees.length) {
        return;
      }
      self.isLoading = true;
      this.quizApiService.nextStep(this.quizService.quiz.name).subscribe((data: IMessage) => {
        this.quizService.readingConfirmationRequested = environment.readingConfirmationEnabled ? data.step
                                                                                                 === MessageProtocol.ReadingConfirmationRequested
                                                                                               : false;
        this.router.navigate(['/quiz', 'flow', 'results']);
        self.isLoading = false;
      });
    };
    this.footerBarService.footerElemQRCode.onClickCallback = () => {
      this.ngbModal.open(QrCodeContentComponent, { centered: true });
    };
    this.footerBarService.footerElemEditQuiz.onClickCallback = () => {
      const promise = this.attendeeService.attendees.length ? this.ngbModal.open(EditModeConfirmComponent).result : new Promise<any>(
        resolve => resolve());
      promise.then(() => {
        this.quizService.close();
        this.attendeeService.cleanUp();
        this.connectionService.cleanUp();
        this.router.navigate(['/quiz', 'manager', 'overview']);
      }).catch(() => {});
    };
  }

  private handleMessages(): void {
    this._messageSubscriptions.push(...[
      this.messageQueue.subscribe(MessageProtocol.AllPlayers, payload => {
        payload.members.forEach((elem: IMemberSerialized) => {
          this.attendeeService.addMember(elem);
        });
      }), this.messageQueue.subscribe(MessageProtocol.Added, payload => {
        this.attendeeService.addMember(payload.member);
      }), this.messageQueue.subscribe(MessageProtocol.Removed, payload => {
        this.attendeeService.removeMember(payload.name);
      }), this.messageQueue.subscribe(MessageProtocol.NextQuestion, payload => {
        this.quizService.quiz.currentQuestionIndex = payload.nextQuestionIndex;
        sessionStorage.removeItem(StorageKey.CurrentQuestionIndex);
      }), this.messageQueue.subscribe(MessageProtocol.Start, payload => {
        this.quizService.quiz.currentStartTimestamp = payload.currentStartTimestamp;
      }), this.messageQueue.subscribe(MessageProtocol.Closed, payload => {
        this.router.navigate(['/']);
      }),
    ]);
    this.quizService.isOwner ? this.handleMessagesForOwner() : this.handleMessagesForAttendee();
  }

  private handleMessagesForOwner(): void {
    this._messageSubscriptions.push(...[
      this.messageQueue.subscribe(MessageProtocol.AllPlayers, payload => {
        this.footerBarService.footerElemStartQuiz.isActive = this.attendeeService.attendees.length > 0;
      }), this.messageQueue.subscribe(MessageProtocol.Added, payload => {
        this.footerBarService.footerElemStartQuiz.isActive = true;
      }), this.messageQueue.subscribe(MessageProtocol.Removed, payload => {
        this.footerBarService.footerElemStartQuiz.isActive = this.attendeeService.attendees.length > 0;
      }),
    ]);
  }

  private handleMessagesForAttendee(): void {
    this._messageSubscriptions.push(...[
      this.messageQueue.subscribe(MessageProtocol.Start, payload => {
        this.router.navigate(['/quiz', 'flow', 'voting']);
      }), this.messageQueue.subscribe(MessageProtocol.UpdatedSettings, payload => {
        this.quizService.quiz.sessionConfig = payload.sessionConfig;
      }), this.messageQueue.subscribe(MessageProtocol.ReadingConfirmationRequested, payload => {
        if (environment.readingConfirmationEnabled) {
          this.router.navigate(['/quiz', 'flow', 'reading-confirmation']);
        } else {
          this.router.navigate(['/quiz', 'flow', 'voting']);
        }
      }), this.messageQueue.subscribe(MessageProtocol.Removed, payload => {
        if (isPlatformBrowser(this.platformId)) {
          const existingNickname = sessionStorage.getItem(StorageKey.CurrentNickName);
          if (existingNickname === payload.name) {
            this.router.navigate(['/']);
          }
        }
      }),
    ]);
  }

  private handleNewAttendee(): void {
    console.log('QuizLobbyComponent: quiz status for attendee initialized', this.quizService.quiz);

    this.headerLabelService.headerLabel = this.quizService.quiz.name;

    this.addFooterElementsAsAttendee();
  }
}
