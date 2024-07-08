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

import {
  ExtractedTextEvent,
  initApi,
  isInvalid, RequiredCommands, RequiredEvents,
  TextRangesExpiredEvent
} from '@acrolinx/app-sdk';
import * as _ from 'lodash';
import packageJson from '../package.json';
import './index.css';
import {INVALID_MARKING_CSS_CLASS, Marking, MARKING_CSS_CLASS, markIssues, Match} from './markings';

const appApi = initApi({
  title: 'Select Ranges',
  version: packageJson.version,
  appSignature: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiU2VsZWN0IFJhbmdlcyIsImlkIjoiYzJlZTZjMGItMThhMC00YjI3LWFiNzctYWY2NjQzODUxMzQ5IiwidHlwZSI6IkFQUCIsImlhdCI6MTU2MTY0NzQ5MX0.hqHcZBKduKjElLl5a4Mo8Tf6GdCnEPR9iBD9QmuiRU0',

  button: {
    text: 'Extract Text',
    tooltip: 'Extract text and select words in the document'
  },

  requiredEvents: [RequiredEvents.invalidRanges, RequiredEvents.textExtracted],
  requiredCommands: [RequiredCommands.selectRanges, RequiredCommands.replaceRanges]
});


function startApp() {
  let markings: Marking[] = [];
  const mainElement = document.querySelector('main')!;
  const matchRegExpElement = document.querySelector<HTMLInputElement>('#matchRegExp')!;

  function findMatches(text: string, pattern: string): Match[] {
    const result: Match[] = [];
    const regex = new RegExp(pattern, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null && match.index < text.length) {
      result.push({surface: match[0], range: {begin: match.index, end: match.index + match[0].length}})
    }
    return result;
  }

  function isError(error: any): error is NodeJS.ErrnoException {
    return error instanceof Error;
  }

  function onTextExtracted(event: ExtractedTextEvent) {
    try {
      const markedIssuesResult = markIssues(event.text, findMatches(event.text, matchRegExpElement.value));
      markings = markedIssuesResult.markings;
      mainElement.innerHTML = markedIssuesResult.html;
    } catch (e) {
      if (isError(e)) {
        mainElement.innerText = e.message;
      } else {
        mainElement.innerText = String(e).valueOf();
      }
    }
  }

  mainElement.addEventListener('click', (ev: MouseEvent) => {
    const markingId = (ev.target as HTMLElement).id;
    const marking = _.find(markings, {id: markingId});
    if (marking) {
      appApi.commands.selectRanges([marking]);
    }
  })

  mainElement.addEventListener('dblclick', (ev: MouseEvent) => {
    const markingId = (ev.target as HTMLElement).id;
    const marking = _.find(markings, {id: markingId});
    if (marking) {
      appApi.commands.replaceRanges([{
        ...marking,
        replacement: marking.match.surface.toUpperCase() + '!'
      }]);
    }
  })

  appApi.events.textExtracted.addEventListener(onTextExtracted)

  appApi.events.invalidRanges.addEventListener((event: TextRangesExpiredEvent) => {
    const [expiredMarkings, validMarkings] = _.partition(markings, marking =>
      isInvalid(event, marking)
    );

    markings = validMarkings;
    expiredMarkings.forEach(marking => {
      const element = document.getElementById(marking.id);
      if (element) {
        element.title = 'This match is out of date. Your document has changed since we have found this match. Try to extract text again.';
        element.className = MARKING_CSS_CLASS + ' ' + INVALID_MARKING_CSS_CLASS;
      }
    });
  });

  const useDummyData = _.includes(window.location.href, 'usedummydata');
  onTextExtracted({
    text: useDummyData ? 'This is an errorr and an problemm.' : '',
    languageId: 'en'
  });
}

startApp();
