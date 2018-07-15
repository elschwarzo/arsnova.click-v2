import { Injectable } from '@angular/core';
import { DB_TABLE, STORAGE_KEY } from '../../shared/enums';
import { AuthorizeApiService } from '../api/authorize/authorize-api.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UserService {
  private _isLoggedIn: boolean;

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  set isLoggedIn(value: boolean) {
    this._casTicket = null;
    this._staticLoginToken = null;
    this._username = null;
    this.persistTokens();
    this._isLoggedIn = value;
  }

  private _casTicket: string;

  get casTicket(): string {
    return this._casTicket;
  }

  private _username: string;

  get username(): string {
    return this._username;
  }

  private _staticLoginToken: string;

  get staticLoginToken(): string {
    return this._staticLoginToken;
  }

  constructor(private authorizeApiService: AuthorizeApiService, private storageService: StorageService) {
  }

  public loadConfig(): Promise<boolean> {
    return new Promise<boolean>(async resolve => {
      if (!await this.storageService.read(DB_TABLE.CONFIG, STORAGE_KEY.TOKEN).toPromise()) {
        resolve(true);
        return;
      }

      const tokens = await this.storageService.read(DB_TABLE.CONFIG, STORAGE_KEY.TOKEN).toPromise();
      this._casTicket = tokens.casTicket;
      this._staticLoginToken = tokens.staticLoginToken;
      this._username = tokens.username;

      if (!this._staticLoginToken) {
        resolve(true);
        return;
      }

      this.authorizeApiService.getValidateStaticLoginToken(this._username, this._staticLoginToken).subscribe(response => {
        this._isLoggedIn = response.status === 'STATUS:SUCCESSFUL' && response.step === 'AUTHENTICATE_STATIC';
        resolve(true);
      });
    });
  }

  public authenticateThroughCas(token: string): Promise<boolean> {
    return new Promise(async resolve => {
      const data = await this.authorizeApiService.getAuthorizationForToken(token).toPromise();

      if (data.status === 'STATUS:SUCCESSFUL') {
        this._isLoggedIn = true;
        this._casTicket = data.payload.casTicket;
        this.persistTokens();
        resolve(true);
      } else {
        this._isLoggedIn = false;
        resolve(false);
      }
    });
  }

  public authenticateThroughLogin(username, passwordHash): Promise<boolean> {
    return new Promise(async resolve => {

      const data = await this.authorizeApiService.postAuthorizationForStaticLogin({
        username,
        passwordHash,
        token: this._staticLoginToken,
      }).toPromise();

      if (data.status === 'STATUS:SUCCESSFUL') {
        this._isLoggedIn = true;
        this._staticLoginToken = data.payload.token;
        this._username = username;
        this.persistTokens();
        resolve(true);
      } else {
        this._isLoggedIn = false;
        resolve(false);
      }
    });
  }

  public hashPassword(username: string, password: string): string {
    return this.sha1(`${username}|${password}`);
  }

  private persistTokens(): void {
    this.storageService.create(DB_TABLE.CONFIG, STORAGE_KEY.TOKEN, {
      casTicket: this._casTicket,
      staticLoginToken: this._staticLoginToken,
      username: this._username,
    }).subscribe();
  }

  private rotl(n, s): number {
    return n << s | n >>> 32 - s;
  }

  private tohex(i2: number): string {
    for (let h = '', s = 28; ; s -= 4) {
      h += (
        i2 >>> s & 0xf
      ).toString(16);
      if (!s) {
        return h;
      }
    }
  }

  private sha1(msg): string {
    let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
    let i, t;
    const M = 0x0ffffffff, W = new Array(80), ml = msg.length, wa = [];
    msg += String.fromCharCode(0x80);
    while (msg.length % 4) {
      msg += String.fromCharCode(0);
    }
    for (i = 0; i < msg.length; i += 4) {
      wa.push(msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 | msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3));
    }
    while (wa.length % 16 !== 14) {
      wa.push(0);
    }
    wa.push(ml >>> 29);
    wa.push((
              ml << 3
            ) & M);
    for (let bo = 0; bo < wa.length; bo += 16) {
      for (i = 0; i < 16; i++) {
        W[i] = wa[bo + i];
      }
      for (i = 16; i <= 79; i++) {
        W[i] = this.rotl(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      }
      let A = H0, B = H1, C = H2, D = H3, E = H4;
      for (i = 0; i <= 19; i++) {
        t = (
              this.rotl(A, 5) + (
                B & C | ~B & D
              ) + E + W[i] + 0x5A827999
            ) & M, E = D, D = C, C = this.rotl(B, 30), B = A, A = t;
      }
      for (i = 20; i <= 39; i++) {
        t = (
              this.rotl(A, 5) + (
                B ^ C ^ D
              ) + E + W[i] + 0x6ED9EBA1
            ) & M, E = D, D = C, C = this.rotl(B, 30), B = A, A = t;
      }
      for (i = 40; i <= 59; i++) {
        t = (
              this.rotl(A, 5) + (
                B & C | B & D | C & D
              ) + E + W[i] + 0x8F1BBCDC
            ) & M, E = D, D = C, C = this.rotl(B, 30), B = A, A = t;
      }
      for (i = 60; i <= 79; i++) {
        t = (
              this.rotl(A, 5) + (
                B ^ C ^ D
              ) + E + W[i] + 0xCA62C1D6
            ) & M, E = D, D = C, C = this.rotl(B, 30), B = A, A = t;
      }
      H0 = H0 + A & M;
      H1 = H1 + B & M;
      H2 = H2 + C & M;
      H3 = H3 + D & M;
      H4 = H4 + E & M;
    }
    return this.tohex(H0) + this.tohex(H1) + this.tohex(H2) + this.tohex(H3) + this.tohex(H4);
  }
}
