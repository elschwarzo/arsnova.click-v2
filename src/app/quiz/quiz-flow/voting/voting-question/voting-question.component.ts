import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-voting-question',
  templateUrl: './voting-question.component.html',
  styleUrls: ['./voting-question.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VotingQuestionComponent {
  private _questionText: string;

  get questionText(): string {
    return this._questionText;
  }

  @Input() set questionText(value: string) {
    this._questionText = value;
    this.cd.markForCheck();
  }

  constructor(private sanitizer: DomSanitizer, private cd: ChangeDetectorRef) { }

  public sanitizeHTML(value: string): string {
    // sanitizer.bypassSecurityTrustHtml is required for highslide
    return this.sanitizer.bypassSecurityTrustHtml(`${value}`) as string;
  }
}
