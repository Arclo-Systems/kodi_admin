declare module 'svgo/browser' {
  export interface SvgoConfig {
    multipass?: boolean;
    plugins?: unknown[];
    js2svg?: { pretty?: boolean; indent?: number };
  }
  export function optimize(input: string, config?: SvgoConfig): { data: string };
}
