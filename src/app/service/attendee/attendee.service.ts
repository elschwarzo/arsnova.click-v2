import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Attendee } from '../../lib/attendee/attendee';
import { MemberEntity } from '../../lib/entities/member/MemberEntity';
import { StorageKey } from '../../lib/enums/enums';
import { QuizState } from '../../lib/enums/QuizState';
import { IMemberSerialized } from '../../lib/interfaces/entities/Member/IMemberSerialized';
import { IQuizResponse } from '../../lib/interfaces/quizzes/IQuizResponse';
import { MemberApiService } from '../api/member/member-api.service';
import { FooterBarService } from '../footer-bar/footer-bar.service';
import { QuizService } from '../quiz/quiz.service';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class AttendeeService {
  private _attendees: Array<MemberEntity> = [];

  get attendees(): Array<MemberEntity> {
    return this._attendees;
  }

  set attendees(value: Array<MemberEntity>) {
    this._attendees = value;
  }

  private _ownNick: string;

  get ownNick(): string {
    return this._ownNick;
  }

  set ownNick(value: string) {
    this._ownNick = value;
    sessionStorage.setItem(StorageKey.CurrentNickName, value);
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private footerBarService: FooterBarService,
    private quizService: QuizService,
    private storageService: StorageService,
    private memberApiService: MemberApiService,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
    }
  }

  public getMemberGroups(): Array<string> {

    if (!this.quizService.quiz) {
      return [];
    }

    return this.quizService.quiz.sessionConfig.nicks.memberGroups;
  }

  public getMembersOfGroup(groupName: string): Array<MemberEntity> {
    return this._attendees.filter(attendee => attendee.groupName === groupName);
  }

  public cleanUp(): void {
    this.attendees = [];
    this.ownNick = null;
  }

  public addMember(attendee: IMemberSerialized): void {
    console.log('AttendeeService: Adding member', attendee);
    if (!this.getMember(attendee.name)) {
      this._attendees.push(new Attendee(attendee));
    }
  }

  public removeMember(name: string): void {
    const member = this.getMember(name);
    if (member) {
      this._attendees.splice(this._attendees.indexOf(member), 1);
    }
  }

  public clearResponses(): void {
    this._attendees.forEach((attendee) => {
      attendee.responses.splice(0, attendee.responses.length, {} as IQuizResponse);
    });
  }

  public isOwnNick(name: string): boolean {
    return name === this._ownNick;
  }

  public modifyResponse(payload: { nickname: string, questionIndex: number, update: { [key: string]: any } }): void {
    const member = this.getMember(payload.nickname);
    if (!member) {
      console.error('AttendeeService: Cannot add member response. Member not found', payload.nickname);
      return;
    }

    Object.keys(payload.update).forEach(updateKey => {
      member.responses[payload.questionIndex][updateKey] = payload.update[updateKey];
    });
  }

  public hasReponse(): boolean {
    const response = this.getMember(this.ownNick).responses[this.quizService.quiz.currentQuestionIndex];
    if (typeof response.value === 'number') {
      return response && !isNaN(response.value);
    }

    return response && response.value.length > 0;
  }

  public hasReadingConfirmation(): boolean {
    const response = this.getMember(this.ownNick).responses[this.quizService.quiz.currentQuestionIndex];
    return response && response.readingConfirmation;
  }

  public hasConfidenceValue(): boolean {
    const response = this.getMember(this.ownNick).responses[this.quizService.quiz.currentQuestionIndex];
    return response && !isNaN(response.confidence);
  }

  private restoreMembers(): Promise<void> {
    return new Promise<void>(resolve => {
      this.memberApiService.getMembers(this.quizService.quiz.name).subscribe((data) => {
        if (!data || !data.payload) {
          return;
        }

        this._attendees = data.payload.members.map((attendee) => {
          return new Attendee(attendee);
        });
        this.footerBarService.footerElemStartQuiz.isActive = this._attendees.length > 0;
        resolve();
      });
    });
  }

  private loadData(): void {
    this._ownNick = sessionStorage.getItem(StorageKey.CurrentNickName);
    this.quizService.quizUpdateEmitter.subscribe(quiz => {
      if (!quiz || typeof quiz.state === 'undefined' || quiz.state === QuizState.Inactive) {
        return;
      }
      this.footerBarService.footerElemStartQuiz.isActive = this._attendees.length > 0;

      console.log('AttendeeService#loadData', 'quiz set', quiz);
      this.restoreMembers();
    });
  }

  private getMember(nickname: string): MemberEntity {
    return this._attendees.find(value => value.name === nickname);
  }
}
