/*
 * Copyright 2019-present Acrolinx GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, softwareq
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { OffsetRange } from '@acrolinx/app-sdk';
import * as _ from 'lodash';

export const MARKING_CSS_CLASS = 'marking';
export const INVALID_MARKING_CSS_CLASS = 'invalid';

export interface Match {
  surface: string;
  range: OffsetRange;
}

export type HTML = string;

export class Marking {
  id: string = _.uniqueId('marking');

  constructor(
    public begin: number,
    public end: number,
    public match: Match,
  ) {}
}

export function markIssues(text: string, words: Match[]): { html: HTML; markings: Marking[] } {
  const markings = words.map((w) => new Marking(w.range.begin, w.range.end, w));
  return { markings, html: createMarkedHtml(text, markings) };
}

export function createMarkedHtml(text: string, sortedMarkings: readonly Marking[]): HTML {
  let pos = 0;
  let outputHtml = '';

  sortedMarkings.forEach((marking) => {
    outputHtml += escapeText(text.substring(pos, marking.begin));
    outputHtml += createMarkingHtml(marking, text);
    pos = marking.end;
  });

  outputHtml += escapeText(text.substring(pos));
  return outputHtml;
}

export function createMarkingHtml(marking: Marking, text: string) {
  const escapedText = escapeText(text.substring(marking.begin, marking.end));
  return `<span id="${marking.id}" class="${MARKING_CSS_CLASS}">${escapedText}</span>`;
}

export function escapeText(text: string) {
  return _.escape(text).replace(/\n/g, '<br/>');
}
