import {TypedEventEmitter} from './event-emitter';
import {
  AnalysisResultEvent, AppApiCapability,
  AppButtonConfig,
  configureAddon,
  OffsetRange,
  replaceRanges,
  ReportType,
  selectRanges,
  SidebarAddonConfig
} from './raw';
import {includes} from './utils';

export const DEVELOPMENT_APP_SIGNATURE = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiS2lsbGVyIEFwcCIsImlkIjoiNGVlZDM3NjctMGYzMS00ZDVmLWI2MjktYzg2MWFiM2VkODUyIiwidHlwZSI6IkFQUCIsImlhdCI6MTU2MTE4ODI5M30.zlVJuGITMjAJ2p4nl-qtpj4N0p_8e4tenr-4dkrGdXg';


export interface ExtractedTextEvent {
  languageId: string;
  text: string;
}

export interface ExtractedTextLinkEvent {
  languageId: string;
  url: string;
}

export interface TextRangesExpiredEvent {
  ranges: OffsetRange[];
}

export enum ApiCommands {
  selectRanges = 'selectRanges',
  replaceRanges = 'replaceRanges'
}

export enum ApiEvents {
  textExtracted = 'textExtracted',
  textExtractedLink = 'textExtractedLink',
  invalidRanges = 'invalidRanges'
}


const DEFAULT_CONFIG: SidebarAddonConfig = {
  appSignature: DEVELOPMENT_APP_SIGNATURE,
  title: 'Acrolinx App',
  requiredReportContent: [],
  requiredReportLinks: [],
};

export class AppApiConnection<C extends keyof AppCommands = keyof AppCommands,
  E extends keyof AppEvents = keyof AppEvents>
  implements AcrolinxAppApi<C, E> {

  private readonly _events = {
    textExtracted: new TypedEventEmitter<ExtractedTextEvent>(),
    textExtractedLink: new TypedEventEmitter<ExtractedTextLinkEvent>(),
    invalidRanges: new TypedEventEmitter<TextRangesExpiredEvent>()
  }

  private readonly _commands: AppCommands = {
    selectRanges: selectRanges,
    replaceRanges: replaceRanges,
  }

  get events(): Pick<AppEvents, E> {
    return this._events;
  }

  get commands(): Pick<AppCommands, C> {
    return this._commands;
  }

  constructor(config: ApiConfig<C, E>) {
    const requiredReportLinks = [];
    if (includes(config.requiredEvents, ApiEvents.textExtracted)) {
      requiredReportLinks.push(ReportType.extractedText)
    }

    const requiredReportContent = [];
    if (includes(config.requiredEvents, ApiEvents.textExtractedLink)) {
      requiredReportContent.push(ReportType.extractedText)
    }

    configureAddon({
      ...DEFAULT_CONFIG, ...(config),
      requiredReportLinks, requiredReportContent,
      requires: config.requiredCommands as AppApiCapability[]
    });

    window.addEventListener('message', messageEvent => {
      console.log('Got message from sidebar', messageEvent.data.type, messageEvent);

      const eventForApp = messageEvent.data;

      if (!eventForApp) {
        return;
      }

      if (eventForApp.type === 'analysisResult') {
        const analysisResult: AnalysisResultEvent = eventForApp;
        const reports = analysisResult.reports;
        const textExtractedReport = reports[ReportType.extractedText] || {};

        if (textExtractedReport.url) {
          this._events.textExtractedLink.dispatchEvent({
            url: textExtractedReport.url,
            languageId: analysisResult.languageId
          });
        }

        if (typeof textExtractedReport.content === 'string') {
          this._events.textExtracted.dispatchEvent({
            text: textExtractedReport.content,
            languageId: analysisResult.languageId
          });
        }
      } else if (eventForApp.type === 'invalidRanges') {
        this._events.invalidRanges.dispatchEvent(eventForApp)
      }
    }, false);
  }
}


interface AppEvents {
  textExtracted: TypedEventEmitter<ExtractedTextEvent>;
  textExtractedLink: TypedEventEmitter<ExtractedTextLinkEvent>;
  invalidRanges: TypedEventEmitter<TextRangesExpiredEvent>;
}

interface AppCommands {
  selectRanges: typeof selectRanges;
  replaceRanges: typeof replaceRanges;
}

interface AcrolinxAppApi<C extends keyof AppCommands, E extends keyof AppEvents> {
  events: Pick<AppEvents, E>;
  commands: Pick<AppCommands, C>;
}


interface ApiConfig<C extends keyof AppCommands, E extends keyof AppEvents> {
  title?: string;
  appSignature: string;
  button?: AppButtonConfig;
  requiredEvents: Array<E>;
  requiredCommands: Array<C>;
}

export function initApi<C extends keyof AppCommands, E extends keyof AppEvents>(
  conf: ApiConfig<C, E>,
): AcrolinxAppApi<C, E> {
  return new AppApiConnection(conf);
}

export function isInvalid(event: TextRangesExpiredEvent, range: OffsetRange): boolean {
  return event.ranges.some(inValidRange =>
    (inValidRange.begin <= range.begin && range.begin <= inValidRange.end) ||
    (inValidRange.begin <= range.end && range.end <= inValidRange.end)
  );
}
