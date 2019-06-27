import * as _ from 'lodash';
import {
  AcrolinxSidebarApp,
  AppApiCapability,
  createAcrolinxApp,
  ExtractedTextEvent,
  OffsetRange,
  replaceRanges,
  selectRanges,
  TextRangesExpiredEvent
} from './acrolinx-sidebar-addon-sdk';
import './index.css';

interface WordOccurrence {
  surface: string;
  range: OffsetRange;
}

function findWords(text: string): WordOccurrence[] {
  const result: WordOccurrence[] = [];
  const regex = /[^\s.,:"]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    result.push({surface: match[0], range: {begin: match.index, end: match.index + match[0].length}})
  }
  return result;
}

type HTML = string;

class Marking {
  id: string = _.uniqueId('marking');

  constructor(public begin: number, public end: number, public word: WordOccurrence) {
  }
}

function markIssues(text: string, words: WordOccurrence[]): { html: HTML, markings: Marking[] } {
  const markings = words.map(w => new Marking(w.range.begin, w.range.end, w));
  return {markings, html: createMarkedHtml(text, markings)};
}

function createMarkedHtml(text: string, sortedMarkings: readonly Marking[]): HTML {
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

function createMarkingHtml(marking: Marking, text: string) {
  const escapedText = escapeText(text.substring(marking.begin, marking.end));
  const cssClasses = 'word';
  return `<span id="${marking.id}" class="marking ${cssClasses}">${escapedText}</span>`
}

function escapeText(text: string) {
  return _.escape(text).replace(/\n/g, '<br/>');
}

class MyApp implements AcrolinxSidebarApp {
  appSignature = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiU2VsZWN0IFJhbmdlcyIsImlkIjoiYzJlZTZjMGItMThhMC00YjI3LWFiNzctYWY2NjQzODUxMzQ5IiwidHlwZSI6IkFQUCIsImlhdCI6MTU2MTY0NzQ5MX0.hqHcZBKduKjElLl5a4Mo8Tf6GdCnEPR9iBD9QmuiRU0';

  title = 'Select It';

  button = {
    text: 'Extract Text',
    tooltip: 'Extract text and select words in the document'
  };

  requires = [AppApiCapability.selectRanges]

  markings: Marking[] = [];
  rootElement = document.getElementById('root')!;

  init() {
    this.rootElement.addEventListener('click', (ev: MouseEvent) => {
      const markingId = (ev.target as HTMLElement).id;
      const marking = _.find(this.markings, {id: markingId});
      console.log('Click', marking);
      if (marking) {
        selectRanges([marking]);
      }
    })
    this.rootElement.addEventListener('dblclick', (ev: MouseEvent) => {
      const markingId = (ev.target as HTMLElement).id;
      const marking = _.find(this.markings, {id: markingId});
      console.log('DoubleClick', marking);
      if (marking) {
        replaceRanges([{
          ...marking,
          replacement: marking.word.surface.toUpperCase() + '!'
        }]);
      }
    })
  }

  onTextExtracted(event: ExtractedTextEvent) {
    const {html, markings} = markIssues(event.text, findWords(event.text));
    this.markings = markings;
    this.rootElement.innerHTML = html;
  }

  onTextRangesExpired(event: TextRangesExpiredEvent): void {
    console.warn('onTextRangesExpired', event);
    const [expiredMarkings, validMarkings] = _.partition(this.markings, marking =>
      event.ranges.some(range =>
        (range.begin <= marking.begin && marking.begin < range.end) ||
        (range.begin <= marking.end && marking.end < range.end)
      )
    );

    console.log(expiredMarkings, validMarkings);
    this.markings = validMarkings;
    expiredMarkings.forEach(marking => {
      const element = document.getElementById(marking.id);
      if (element) {
        element.className = '';
      }
    });

  }

}

const acrolinxSidebarApp = createAcrolinxApp(new MyApp());

acrolinxSidebarApp.init();

const useDummyData = window.location.href.includes('usedummydata');
acrolinxSidebarApp.onTextExtracted({
  text: useDummyData ? 'This is an errorr and an problemm.' : '',
  languageId: 'en'
});
