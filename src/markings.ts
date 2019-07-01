import * as _ from 'lodash';
import {OffsetRange} from './sdk/raw';

export const MARKING_CSS_CLASS = 'marking';

export interface Match {
  surface: string;
  range: OffsetRange;
}

export type HTML = string;

export class Marking {
  id: string = _.uniqueId('marking');

  constructor(public begin: number, public end: number, public match: Match) {
  }
}

export function markIssues(text: string, words: Match[]): { html: HTML, markings: Marking[] } {
  const markings = words.map(w => new Marking(w.range.begin, w.range.end, w));
  return {markings, html: createMarkedHtml(text, markings)};
}

export function createMarkedHtml(text: string, sortedMarkings: readonly Marking[]): HTML {
  let pos = 0;
  let outputHtml = '';

  for (const marking of sortedMarkings) {
    outputHtml += escapeText(text.substring(pos, marking.begin));
    outputHtml += createMarkingHtml(marking, text);
    pos = marking.end;
  }

  outputHtml += escapeText(text.substring(pos));
  return outputHtml;
}

export function createMarkingHtml(marking: Marking, text: string) {
  const escapedText = escapeText(text.substring(marking.begin, marking.end));
  const cssClasses = MARKING_CSS_CLASS;
  return `<span id="${marking.id}" class="marking ${cssClasses}">${escapedText}</span>`
}

export function escapeText(text: string) {
  return _.escape(text).replace(/\n/g, '<br/>');
}
