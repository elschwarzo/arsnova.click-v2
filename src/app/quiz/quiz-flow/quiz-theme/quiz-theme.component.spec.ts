import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { async, ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateCompiler, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { createTranslateLoader } from '../../../../lib/translation.factory';
import { ConnectionMockService } from '../../../service/connection/connection.mock.service';
import { ConnectionService } from '../../../service/connection/connection.service';
import { CurrentQuizMockService } from '../../../service/current-quiz/current-quiz.mock.service';
import { CurrentQuizService } from '../../../service/current-quiz/current-quiz.service';
import { FooterBarService } from '../../../service/footer-bar/footer-bar.service';
import { SettingsService } from '../../../service/settings/settings.service';
import { SharedService } from '../../../service/shared/shared.service';
import { ThemesMockService } from '../../../service/themes/themes.mock.service';
import { ThemesService } from '../../../service/themes/themes.service';
import { TrackingMockService } from '../../../service/tracking/tracking.mock.service';
import { TrackingService } from '../../../service/tracking/tracking.service';
import { WebsocketMockService } from '../../../service/websocket/websocket.mock.service';
import { WebsocketService } from '../../../service/websocket/websocket.service';
import { ThemesComponent } from '../../../themes/themes.component';

import { QuizThemeComponent } from './quiz-theme.component';

describe('QuizThemeComponent', () => {
  let component: QuizThemeComponent;
  let fixture: ComponentFixture<QuizThemeComponent>;
  let backend: HttpTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientModule,
        HttpClientTestingModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useFactory: (createTranslateLoader),
            deps: [HttpClient],
          },
          compiler: {
            provide: TranslateCompiler,
            useClass: TranslateMessageFormatCompiler,
          },
        }),
      ],
      providers: [
        FooterBarService,
        { provide: CurrentQuizService, useClass: CurrentQuizMockService },
        { provide: ThemesService, useClass: ThemesMockService },
        SettingsService,
        { provide: ConnectionService, useClass: ConnectionMockService },
        { provide: WebsocketService, useClass: WebsocketMockService },
        SharedService,
        { provide: TrackingService, useClass: TrackingMockService },
      ],
      declarations: [ThemesComponent, QuizThemeComponent],
    }).compileComponents();
  }));

  beforeEach(async(() => {
    fixture = TestBed.createComponent(QuizThemeComponent);
    backend = TestBed.get(HttpTestingController);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  afterEach(() => {
    backend.verify();
  });

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));
  it('should contain a TYPE reference', async(() => {
    expect(QuizThemeComponent.TYPE).toEqual('QuizThemeComponent');
  }));

  it('#updateTheme', async(inject(
    [CurrentQuizService], (currentQuizService: CurrentQuizService) => {
      const theme = 'theme-Material';

      spyOn(currentQuizService, 'toggleSettingByName').and.callThrough();

      component.updateTheme(theme).subscribe(() => {
        expect(currentQuizService.quiz.sessionConfig.theme).toEqual(theme);
        expect(currentQuizService.toggleSettingByName).toHaveBeenCalled();
      });
    }),
  ));

  it('#previewTheme', () => {
    const theme = 'theme-Material';
    component.previewTheme(theme);
    expect(document.getElementsByTagName('html').item(0).dataset['theme']).toEqual(theme);
  });

  it('#restoreTheme', () => {
    const theme = 'theme-Material';

    component.previewTheme(theme);
    component.restoreTheme();
    expect(document.getElementsByTagName('html').item(0).dataset['theme']).toEqual(theme);
  });
});
