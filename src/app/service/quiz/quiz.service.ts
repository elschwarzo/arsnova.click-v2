import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ReplaySubject } from 'rxjs';
import { AbstractQuestionEntity } from '../../lib/entities/question/AbstractQuestionEntity';
import { QuizEntity } from '../../lib/entities/QuizEntity';
import { StorageKey } from '../../lib/enums/enums';
import { NoDataErrorComponent } from '../../shared/no-data-error/no-data-error.component';
import { QuizApiService } from '../api/quiz/quiz-api.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  public readonly quizUpdateEmitter: ReplaySubject<QuizEntity> = new ReplaySubject(1);

  private _isOwner = false;

  get isOwner(): boolean {
    return this._isOwner;
  }

  set isOwner(value: boolean) {
    this._isOwner = value;
  }

  private _quiz: QuizEntity;

  get quiz(): QuizEntity {
    return this._quiz;
  }

  set quiz(value: QuizEntity) {
    if (value) {
      sessionStorage.setItem(StorageKey.CurrentQuizName, value.name);
      // noinspection SuspiciousInstanceOfGuard
      if (!(value instanceof QuizEntity)) {
        value = new QuizEntity(value);
      }
    }
    this._quiz = value;
    this.quizUpdateEmitter.next(value);
  }

  private _readingConfirmationRequested = false;

  get readingConfirmationRequested(): boolean {
    return this._readingConfirmationRequested;
  }

  set readingConfirmationRequested(value: boolean) {
    this._readingConfirmationRequested = value;
  }

  private _isInEditMode = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translateService: TranslateService,
    private storageService: StorageService,
    private settingsService: SettingsService,
    private quizApiService: QuizApiService, private ngbModal: NgbModal,
  ) {
  }

  public cleanUp(): void {
    this._readingConfirmationRequested = false;

    if (isPlatformBrowser(this.platformId)) {
      this.close();
      this.quiz = null;
      this.isOwner = false;
    }
  }

  public persist(): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.storageService.db.Quiz.put(this.quiz);

    if (this._isInEditMode) {
      this.quizApiService.putSavedQuiz(this.quiz).subscribe();
      this.quizUpdateEmitter.next(this.quiz);
    }
  }

  public persistQuiz(quiz: QuizEntity): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.storageService.db.Quiz.put(quiz);

    if (this._isInEditMode) {
      this.quizApiService.putSavedQuiz(quiz).subscribe();
    }
  }

  public currentQuestion(): AbstractQuestionEntity {
    if (!this.quiz) {
      return;
    }

    return this.quiz.questionList[this.quiz.currentQuestionIndex];
  }

  public close(): void {
    if (isPlatformServer(this.platformId)) {
      return null;
    }

    if (this.isOwner && this._quiz) {
      this.quizApiService.deleteActiveQuiz(this._quiz).subscribe();
    }
  }

  public isValid(): boolean {
    return this.quiz && this.quiz.isValid();
  }

  public getVisibleQuestions(maxIndex?: number): Array<AbstractQuestionEntity> {
    if (!this._quiz) {
      return [];
    }
    return this._quiz.questionList.slice(0, maxIndex || this.quiz.currentQuestionIndex + 1);
  }

  public hasSelectedNick(nickname: string): boolean {
    return this.quiz.sessionConfig.nicks.selectedNicks.indexOf(nickname) !== -1;
  }

  public toggleSelectedNick(nickname: string): void {
    if (this.hasSelectedNick(nickname)) {
      this.removeSelectedNickByName(nickname);
    } else {
      this.addSelectedNick(nickname);
    }
  }

  public addSelectedNick(newSelectedNick: string): void {
    if (this.hasSelectedNick(newSelectedNick)) {
      return;
    }
    this.quiz.sessionConfig.nicks.selectedNicks.push(newSelectedNick);
  }

  public removeSelectedNickByName(selectedNick: string): void {
    const index = this.quiz.sessionConfig.nicks.selectedNicks.indexOf(selectedNick);
    if (index === -1) {
      return;
    }
    this.quiz.sessionConfig.nicks.selectedNicks.splice(index, 1);
  }

  public loadDataToPlay(quizName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!quizName) {
        const instance = this.ngbModal.open(NoDataErrorComponent, {
          keyboard: false,
          backdrop: 'static',
        });
        instance.componentInstance.targetMessage = 'global.no-data-error.load-to-play';
        instance.result.catch(() => {});
        reject();
        return;
      }

      if (this.quiz) {
        console.log('QuizService: aborting loadDataToPlay since the quiz is already present', quizName);
        resolve();
        return;
      }

      this.storageService.db.Quiz.get(quizName).then(quiz => {

        console.log('QuizService: loadDataToPlay finished', quizName);
        this.isOwner = !!quiz;
        console.log('QuizService: isOwner', this.isOwner);
        this.restoreSettings(quizName).then(() => resolve());
      });
    });
  }

  public loadDataToEdit(quizName: string): void {
    if (!quizName) {
      const instance = this.ngbModal.open(NoDataErrorComponent, {
        keyboard: false,
        backdrop: 'static',
      });
      instance.componentInstance.target = ['/quiz/overview'];
      instance.componentInstance.targetMessage = 'global.no-data-error.load-to-edit';
      instance.componentInstance.targetButton = 'global.no-data-error.to-quiz-overview';
      instance.result.catch(() => {});
      return;
    }

    this.storageService.db.Quiz.get(quizName).then(quiz => {
      if (!quiz) {
        return;
      }

      this.isOwner = true;
      this._isInEditMode = true;
      this.quiz = new QuizEntity(quiz);
      console.log('QuizService: loadDataToEdit finished', quiz, quizName);
    });
  }

  public stopEditMode(): void {
    this._isInEditMode = false;
  }

  private restoreSettings(quizName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.quizApiService.getQuiz(quizName).subscribe(response => {
        if (!response.payload.quiz) {
          reject();
          throw new Error(`No valid quiz found in quizStatus: ${JSON.stringify(response)}`);
        }

        this.quiz = response.payload.quiz;
        resolve();
      });
    });
  }
}
