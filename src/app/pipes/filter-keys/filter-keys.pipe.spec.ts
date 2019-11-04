import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { async, TestBed } from '@angular/core/testing';
import { JWT_OPTIONS, JwtModule } from '@auth0/angular-jwt';
import { jwtOptionsFactory } from '../../../lib/jwt.factory';
import { I18nManagerApiService } from '../../service/api/i18n-manager/i18n-manager-api.service';
import { LanguageLoaderService } from '../../service/language-loader/language-loader.service';
import { ProjectLoaderService } from '../../service/project-loader/project-loader.service';
import { IndexedDbService } from '../../service/storage/indexed.db.service';
import { StorageService } from '../../service/storage/storage.service';
import { StorageServiceMock } from '../../service/storage/storage.service.mock';
import { UserService } from '../../service/user/user.service';
import { FilterKeysPipe } from './filter-keys.pipe';

describe('FilterKeysPipe', () => {
  let pipe: FilterKeysPipe;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        JwtModule.forRoot({
          jwtOptionsProvider: {
            provide: JWT_OPTIONS,
            useFactory: jwtOptionsFactory,
            deps: [PLATFORM_ID, StorageService],
          },
        }), HttpClientTestingModule,
      ],
      providers: [
        LanguageLoaderService, I18nManagerApiService, ProjectLoaderService, {
          provide: UserService,
          useValue: {},
        }, IndexedDbService, {
          provide: StorageService,
          useClass: StorageServiceMock,
        },
      ],
      declarations: [
        FilterKeysPipe,
      ],
    }).compileComponents();
  }));

  beforeEach(async(() => {
    pipe = new FilterKeysPipe(TestBed.get(LanguageLoaderService));
  }));

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });
});
