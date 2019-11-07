import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipeMock } from '../../../../_mocks/TranslatePipeMock';
import { TranslateServiceMock } from '../../../../_mocks/TranslateServiceMock';
import { ConnectionMockService } from '../../../service/connection/connection.mock.service';
import { ConnectionService } from '../../../service/connection/connection.service';
import { FooterBarService } from '../../../service/footer-bar/footer-bar.service';
import { QuizMockService } from '../../../service/quiz/quiz-mock.service';
import { QuizService } from '../../../service/quiz/quiz.service';
import { SettingsService } from '../../../service/settings/settings.service';
import { SharedService } from '../../../service/shared/shared.service';
import { StorageService } from '../../../service/storage/storage.service';
import { StorageServiceMock } from '../../../service/storage/storage.service.mock';
import { AudioPlayerComponent } from '../../../shared/audio-player/audio-player.component';
import { SoundManagerComponent } from './sound-manager.component';

describe('SoundManagerComponent', () => {
  let component: SoundManagerComponent;
  let fixture: ComponentFixture<SoundManagerComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule, HttpClientModule, FontAwesomeModule,
      ],
      providers: [
        {
          provide: StorageService,
          useClass: StorageServiceMock,
        }, {
          provide: QuizService,
          useClass: QuizMockService,
        }, FooterBarService, SettingsService, {
          provide: ConnectionService,
          useClass: ConnectionMockService,
        }, SharedService, {
          provide: TranslateService,
          useClass: TranslateServiceMock,
        },
      ],
      declarations: [
        SoundManagerComponent, TranslatePipeMock, AudioPlayerComponent,
      ],
    }).compileComponents();
  }));

  beforeEach((() => {
    fixture = TestBed.createComponent(SoundManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should be created', (() => {
    expect(component).toBeTruthy();
  }));
  it('should contain a TYPE reference', (() => {
    expect(SoundManagerComponent.TYPE).toEqual('SoundManagerComponent');
  }));

  describe('#selectSound', () => {
    it('should select a given sound title', inject([QuizService], (quizService: QuizService) => {
      const value = 'Song1';
      const event = <any>{ target: { value } };
      quizService.quizUpdateEmitter.next(quizService.quiz);
      component.selectSound('lobby', event);
      expect(quizService.quiz.sessionConfig.music.titleConfig.lobby).toEqual(value);
    }));
  });

  describe('#setGlobalVolume', () => {
    it('should set the global volume', inject([QuizService], (quizService: QuizService) => {
      const value = 10;
      const event = <any>{ target: { value } };
      quizService.quizUpdateEmitter.next(quizService.quiz);
      component.setGlobalVolume(event);
      expect(quizService.quiz.sessionConfig.music.volumeConfig.global).toEqual(value);
    }));
  });

  describe('#openTab', () => {
    it('should open a config tab', inject([QuizService], (quizService: QuizService) => {
      const id = 'panel-lobby';
      component.openTab(id);
      expect(component.isSelected(id)).toBeTruthy();
    }));
  });
});
