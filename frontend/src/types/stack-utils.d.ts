declare module 'stack-utils' {
  export interface StackData {
    line: number;
    column: number;
    file: string;
    constructor: boolean;
    evalOrigin: string;
    native: boolean;
    function: string;
    method: string;
  }

  export default class StackUtils {
    constructor(options?: {
      internals?: RegExp[];
      cwd?: string;
      wrapCallSite?: (callSite: any) => any;
    });

    clean(stack: string | string[]): string;
    capture(limit?: number, startStackFunction?: Function): StackData[];
    at(startStackFunction?: Function): StackData;
    parseLine(line: string): StackData | null;
  }
} 