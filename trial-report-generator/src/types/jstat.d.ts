declare module "jstat" {
  export const jStat: {
    studentt: { inv(p: number, df: number): number };
    centralF: { cdf(x: number, df1: number, df2: number): number };
    [key: string]: unknown;
  };
  const _default: unknown;
  export default _default;
}
