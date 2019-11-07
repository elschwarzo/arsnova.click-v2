import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { SwUpdate } from '@angular/service-worker';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModalModule, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TOAST_CONFIG } from 'ngx-toastr';
import { of } from 'rxjs';
import { SwUpdateMock } from '../../../../../_mocks/SwUpdateMock';
import { TranslatePipeMock } from '../../../../../_mocks/TranslatePipeMock';
import { TranslateServiceMock } from '../../../../../_mocks/TranslateServiceMock';
import { HeaderComponent } from '../../../../header/header/header.component';
import { LivePreviewComponent } from '../../../../live-preview/live-preview/live-preview.component';
import { MarkdownBarComponent } from '../../../../markdown/markdown-bar/markdown-bar.component';
import { ConnectionMockService } from '../../../../service/connection/connection.mock.service';
import { ConnectionService } from '../../../../service/connection/connection.service';
import { FooterBarService } from '../../../../service/footer-bar/footer-bar.service';
import { HeaderLabelService } from '../../../../service/header-label/header-label.service';
import { I18nService } from '../../../../service/i18n/i18n.service';
import { QuestionTextService } from '../../../../service/question-text/question-text.service';
import { QuizMockService } from '../../../../service/quiz/quiz-mock.service';
import { QuizService } from '../../../../service/quiz/quiz.service';
import { SettingsService } from '../../../../service/settings/settings.service';
import { SharedService } from '../../../../service/shared/shared.service';
import { StorageService } from '../../../../service/storage/storage.service';
import { StorageServiceMock } from '../../../../service/storage/storage.service.mock';
import { TrackingMockService } from '../../../../service/tracking/tracking.mock.service';
import { TrackingService } from '../../../../service/tracking/tracking.service';
import { QuestiontextComponent } from './questiontext.component';

describe('QuestiontextComponent', () => {
  let component: QuestiontextComponent;
  let fixture: ComponentFixture<QuestiontextComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule, RouterTestingModule, NgbModalModule, AngularSvgIconModule, NgbPopoverModule, FontAwesomeModule,
      ],
      providers: [
        {
          provide: StorageService,
          useClass: StorageServiceMock,
        }, {
          provide: QuizService,
          useClass: QuizMockService,
        }, HeaderLabelService, FooterBarService, SettingsService, {
          provide: ConnectionService,
          useClass: ConnectionMockService,
        }, {
          provide: TranslateService,
          useClass: TranslateServiceMock,
        }, {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: () => 0,
            }),
          },
        }, SharedService, QuestionTextService, {
          provide: TrackingService,
          useClass: TrackingMockService,
        }, I18nService, {
          provide: SwUpdate,
          useClass: SwUpdateMock,
        }, {
          provide: TOAST_CONFIG,
          useValue: {
            default: {},
            config: {},
          },
        },
      ],
      declarations: [
        HeaderComponent, LivePreviewComponent, MarkdownBarComponent, QuestiontextComponent, TranslatePipeMock,
      ],
    }).compileComponents();
  }));

  beforeEach((() => {
    fixture = TestBed.createComponent(QuestiontextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should be created', (() => {
    expect(component).toBeTruthy();
  }));
  it('should contain a TYPE reference', (() => {
    expect(QuestiontextComponent.TYPE).toEqual('QuestiontextComponent');
  }));

  describe('#connector', () => {
    it('should call the markdown interpreter if a markdown button is pressed', () => {
      expect(() => component.connector('boldMarkdownButton')).not.toThrowError();
    });
  });

  describe('#fireEvent', () => {
    it('should update the height of the textarea and parse the input on keypress', () => {
      const event = <any>{ target: { value: 'testValue' } };
      expect(() => component.fireEvent(event)).not.toThrowError();
    });
  });
});
