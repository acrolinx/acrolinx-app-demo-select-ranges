import * as _ from 'lodash';
import {
  AcrolinxSidebarApp, AppApiCapability,
  createAcrolinxApp,
  ExtractedTextEvent,
  OffsetRange,
  selectRanges
} from './acrolinx-sidebar-addon-sdk';
import './index.css';

interface WordOccurrence {
  range: OffsetRange;
}

function findWords(text: string): WordOccurrence[] {
  const result: WordOccurrence[] = [];
  const regex = /[^\s.,:"]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    result.push({range: {begin: match.index, end: match.index + match[0].length}})
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
  title = 'Select It';

  button = {
    text: 'Extract Text',
    tooltip: 'Extract text and select words in the document'
  };

  requires = [AppApiCapability.selectRanges]

  markings: Marking[] =  [];
  rootElement =  document.getElementById('root')!;

  init() {
    this.rootElement.addEventListener('click', (ev: MouseEvent) => {
      const markingId = (ev.target as HTMLElement).id;
      const marking = _.find(this.markings, {id: markingId});
      console.log('Click', marking);
      if (marking) {
        selectRanges([marking]);
      }
    })
  }

  onTextExtracted(event: ExtractedTextEvent) {
    const {html, markings} = markIssues(event.text, findWords(event.text));
    this.markings = markings;
    this.rootElement.innerHTML = html;
  }
}

const acrolinxSidebarApp = createAcrolinxApp(new MyApp());

acrolinxSidebarApp.init();

const useDummyData = window.location.href.includes('usedummydata');
acrolinxSidebarApp.onTextExtracted({
  text: useDummyData ? 'This is an errorr and an problemm.' : '',
  languageId: 'en'
});
