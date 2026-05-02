declare module "intl-segmenter" {
   export class Segmenter {
      constructor(
         language?: string | Intl.Locale,
         options?: Intl.SegmenterOptions & {
            maxChunkLength?: number;
         }
      );

      segment(input: string): Iterable<Intl.SegmentData>;
      getSegments(input: string): Intl.SegmentData[];
   }
}
