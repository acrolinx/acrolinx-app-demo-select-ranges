import * as _ from 'lodash';
import './index.css';
import {Marking, MARKING_CSS_CLASS, markIssues, Match} from './markings';
import {ApiCommands, ApiEvents, ExtractedTextEvent, initApi, isInvalid, TextRangesExpiredEvent} from '@acrolinx/app-sdk';

const appApi = initApi({
  title: 'Select Ranges',
  appSignature: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiU2VsZWN0IFJhbmdlcyIsImlkIjoiYzJlZTZjMGItMThhMC00YjI3LWFiNzctYWY2NjQzODUxMzQ5IiwidHlwZSI6IkFQUCIsImlhdCI6MTU2MTY0NzQ5MX0.hqHcZBKduKjElLl5a4Mo8Tf6GdCnEPR9iBD9QmuiRU0',

  button: {
    text: 'Extract Text',
    tooltip: 'Extract text and select words in the document'
  },

  requiredEvents: [ApiEvents.invalidRanges, ApiEvents.textExtracted],
  requiredCommands: [ApiCommands.selectRanges, ApiCommands.replaceRanges]
});


function startApp() {
  let markings: Marking[] = [];
  const mainElement = document.querySelector('main')!;
  const matchRegExpElement = document.querySelector<HTMLInputElement>('#matchRegExp')!;

  function findMatches(text: string, pattern: string): Match[] {
    const result: Match[] = [];
    const regex = new RegExp(pattern, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      result.push({surface: match[0], range: {begin: match.index, end: match.index + match[0].length}})
    }
    return result;
  }

  function onTextExtracted(event: ExtractedTextEvent) {
    try {
      const markedIssuesResult = markIssues(event.text, findMatches(event.text, matchRegExpElement.value));
      markings = markedIssuesResult.markings;
      mainElement.innerHTML = markedIssuesResult.html;
    } catch (e) {
      mainElement.innerText = e.message;
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
        element.className = MARKING_CSS_CLASS + ' invalid';
      }
    });
  });

  const useDummyData = window.location.href.includes('usedummydata');
  onTextExtracted({
    text: useDummyData ? 'This is an errorr and an problemm.' : '',
    languageId: 'en'
  });
}

startApp();
