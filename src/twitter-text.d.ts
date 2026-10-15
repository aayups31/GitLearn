declare module "twitter-text" {
  const twitter: {
    parseTweet(text: string): { weightedLength: number; valid: boolean };
  };
  export default twitter;
}
