import { Segmenter } from "intl-segmenter";
import type { SegmenterAdapter, SegmentGranularity, SegmentResult } from "../core/types.js";

export function createIntlSegmenterAdapter(locale = "und"): SegmenterAdapter {
   return {
      segment(text: string, granularity: SegmentGranularity): Iterable<SegmentResult> {
         return segmentWithStableIndexes(text, locale, granularity);
      }
   };
}

function* segmentWithStableIndexes(
   text: string,
   locale: string,
   granularity: SegmentGranularity
): Iterable<SegmentResult> {
   let segmenter = new Segmenter(locale, { granularity, maxChunkLength: 200 });
   let cursor = 0;

   for (let segment of segmenter.segment(text)) {
      let value = segment.segment;
      let index = text.indexOf(value, cursor);
      if (index < 0) index = cursor;

      yield {
         segment: value,
         index,
         isWordLike: segment.isWordLike
      };

      cursor = index + value.length;
   }
}
