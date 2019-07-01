export interface AppButtonConfig {
  text: string;
  tooltip?: string;
}

export enum ReportType {
  extractedText = 'extractedText'
}

export enum AppApiCapability {
  selectRanges = 'selectRanges',
  replaceRanges = 'replaceRanges'
}

export interface SidebarAddonConfig {
  appSignature: string;
  title: string;
  button?: AppButtonConfig;
  requires?: AppApiCapability[];
  requiredReportLinks: readonly ReportType[];
  requiredReportContent: readonly ReportType[];
}

export type ReportsForAddon = {
  [P in ReportType]?: ReportForAddon;
};

interface ReportForAddon {
  url?: string;
  content?: string;
}

export interface AnalysisResultEvent {
  type: 'analysisResult';
  languageId: string;
  reports: ReportsForAddon;
}

interface InvalidateRangesEvent {
  type: 'invalidRanges';
  ranges: OffsetRange[];
}

export type EventForApp = AnalysisResultEvent | InvalidateRangesEvent;


export interface OffsetRange {
  begin: number;
  end: number;
}

export interface OffsetRangeWithReplacement {
  replacement: string;
  begin: number;
  end: number;
}

export function openWindow(url: string) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({command: 'acrolinx.sidebar.openWindow', url}, '*');
  } else {
    window.open(url);
  }
}

export function selectRanges(ranges: OffsetRange[]) {
  postMessageToSidebar({command: 'acrolinx.sidebar.selectRanges', ranges});
}

export function replaceRanges(ranges: OffsetRangeWithReplacement[]) {
  postMessageToSidebar({command: 'acrolinx.sidebar.replaceRanges', ranges});
}

export function configureAddon(config: SidebarAddonConfig) {
  postMessageToSidebar({command: 'acrolinx.sidebar.configureAddon', config: config});
}

function postMessageToSidebar<T extends { command: string }>(message: T) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
  } else {
    console.warn('Missing parent window with sidebar.', message);
  }
}
