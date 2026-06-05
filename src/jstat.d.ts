declare module 'jstat' {
  export const jStat: {
    normal: {
      pdf(x: number, mean: number, std: number): number;
      cdf(x: number, mean: number, std: number): number;
      inv(p: number, mean: number, std: number): number;
    };
    chisquare: {
      cdf(x: number, df: number): number;
      inv(p: number, df: number): number;
    };
    studentt: {
      cdf(x: number, df: number): number;
      inv(p: number, df: number): number;
    };
  };
}
