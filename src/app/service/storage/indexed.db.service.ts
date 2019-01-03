import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, throwError as observableThrowError } from 'rxjs';
import { DbName, DbTable, StorageKey } from '../../../lib/enums/enums';

interface ISchema {
  name: DbTable;
  indexes?: Array<string>;
  seeds?: Array<any>;
}

@Injectable()
export class IndexedDbService {
  get stateNotifier(): BehaviorSubject<string> {
    return this._stateNotifier;
  }

  private _dbName: string;

  get dbName(): string {
    return this._dbName;
  }

  private _dbInstance: any;

  set dbInstance(value: any) {
    this._dbInstance = value;
  }

  private _isInitialized = !!this._dbInstance;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private _indexedDB: any;
  private readonly _stateNotifier = new BehaviorSubject<string>(this.isInitialized ? 'initialized' : null);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this._indexedDB = indexedDB;
    }

    this._dbName = DbName.Default; // by default
  }

  public setName(dbName: string): void {
    if (dbName.length > 0 && dbName !== undefined) {
      this._dbName = dbName;
    } else {
      console.error('Error: invalid dbName');
    }
  }

  public put(source: DbTable, object: any): Observable<any> {
    const self = this;

    return Observable.create((observer: any) => {
      this.open().subscribe((db: any) => {
        const tx = db.transaction(source, 'readwrite');
        const store = tx.objectStore(source);
        store.put(object);

        tx.oncomplete = () => {
          observer.next(object);
          observer.complete();
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public post(source: DbTable, object: any): Observable<any> {
    const self = this;

    return Observable.create((observer: any) => {
      this.open().subscribe((db: any) => {
        const tx = db.transaction(source, 'readwrite');
        const store = tx.objectStore(source);
        const request = store.add(object);

        request.onsuccess = (e: any) => {
          observer.next(e.target.result);
          observer.complete();
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public get(source: DbTable, id: StorageKey | string): Observable<any> {
    const self = this;

    return Observable.create((observer: any) => {
      this.open().subscribe((db: any) => {
        const tx = db.transaction(source, 'readonly');
        const store = tx.objectStore(source);
        const index = store.index('id_idx');
        const request = index.get(id);

        request.onsuccess = () => {
          observer.next(request.result ? request.result.value ? request.result.value : request.result : null);
          observer.complete();
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public all(source: DbTable, filter?: string): Observable<any[]> {
    const self = this;

    return Observable.create((observer: any) => {
      const indexName = 'id_idx';

      this.open().subscribe((db: any) => {
        const tx = db.transaction(source, 'readonly');
        const store = tx.objectStore(source);
        const index = store.index(indexName);
        const request = index.openCursor();
        const results: any[] = [];

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            observer.next(results);
            observer.complete();
          }
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public remove(source: DbTable, id: StorageKey | string): Observable<any> {
    const self = this;

    return Observable.create((observer: any) => {
      this.open().subscribe((db: any) => {
        const tx = db.transaction(source, 'readwrite');
        const store = tx.objectStore(source);

        store.delete(id);

        tx.oncomplete = (e: any) => {
          observer.next(id);
          observer.complete();
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public count(source: DbTable): Observable<number> {
    const self = this;

    return Observable.create((observer: any) => {
      this.open().subscribe((db: any) => {
        const indexName = 'id_idx';
        const tx = db.transaction(source, 'readonly');
        const store = tx.objectStore(source);
        const index = store.index(indexName);
        const request = index.count();

        request.onsuccess = () => {
          observer.next(request.result);
          observer.complete();
        };
        db.onerror = (e: any) => {
          db.close();
          self.handleError('IndexedDB error: ' + e.target.errorCode);
        };
      });
    });
  }

  public create(schema?: Array<ISchema>): Observable<any> {
    return Observable.create((observer: any) => {
      const instance = this._indexedDB.open(this._dbName);

      instance.onupgradeneeded = () => {
        // The database did not previously exist, so create object stores and indexes.
        const db = instance.result;

        for (let i = 0; i < schema.length; i++) {
          const store = db.createObjectStore(schema[i].name, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('id_idx', 'id', { unique: true });

          if (schema[i].indexes !== undefined) {
            for (let j = 0; j < schema[i].indexes.length; j++) {
              const index = schema[i].indexes[j];
              store.createIndex(`${index}_idx`, index);
            }
          }

          if (schema[i].seeds !== undefined) {
            for (let j = 0; j < schema[i].seeds.length; j++) {
              const seed = schema[i].seeds[j];
              store.put(seed);
            }
          }
        }

        observer.next('done');
      };

      instance.onerror = () => {
        this.handleError(instance.error);
        observer.error(instance.error);
      };

      instance.onsuccess = () => {
        this._dbInstance = instance;
        observer.complete();
      };
    });
  }

  public clear(): Observable<any> {
    const self = this;

    return Observable.create((observer: any) => {
      const request = this._indexedDB.deleteDatabase(this._dbName);

      request.onsuccess = () => {
        observer.next('done');
        observer.complete();
      };
      request.onerror = () => {
        self.handleError('Could not delete indexed db.');
      };
      request.onblocked = () => {
        self.handleError('Could not delete database due to the operation being blocked.');
      };
    });
  }

  private handleError(msg: string): Observable<any> {
    console.error(msg);
    return observableThrowError(msg);
  }

  private open(): Observable<any> {
    this._dbInstance = null;

    return Observable.create((observer: any) => {
      const instance = this._indexedDB.open(this._dbName);

      instance.onsuccess = () => {
        this._dbInstance = instance;
        observer.next(this._dbInstance.result);
        observer.complete();
      };
      instance.onerror = () => this.handleError.call(this, instance.error);
    });
  }
}
