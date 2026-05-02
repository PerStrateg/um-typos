import assert from "node:assert/strict";
import {
   createTextTransformEngine,
   dictionaryReplacementFilter,
   englishPack,
   russianPack
} from "../dist/index.js";

const sampleEn = "This application transforms text because you know it is very good.";
const sampleRu = "Это приложение превращает текст, потому что сейчас очень хорошо.";

const engine = createTextTransformEngine({
   seed: "smoke-seed",
   languages: [englishPack, russianPack],
   defaultLanguage: "en"
});

const enabledCore = {
   phraseReplacement: { enabled: true, intensity: 1 },
   dictionaryReplacement: { enabled: true, intensity: 1 },
   misspelling: { enabled: true, intensity: 0.7 },
   phraseInsertion: { enabled: true, intensity: 0.8 },
   numberSimplification: { enabled: true, intensity: 1 },
   emoji: { enabled: false }
};

const first = engine.transform(sampleEn, {
   language: "en",
   intensity: 0.85,
   filters: enabledCore
});
const second = engine.transform(sampleEn, {
   language: "en",
   intensity: 0.85,
   filters: enabledCore
});

assert.equal(first.text, second.text);
assert.deepEqual(first.changes, second.changes);
assert.equal(first.language, "en");
assert.ok(first.appliedFilters.includes("dictionaryReplacement"));
assert.ok(first.text.length > 0);

const disabledDictionary = engine.transform(sampleEn, {
   language: "en",
   intensity: 1,
   filters: {
      dictionaryReplacement: { enabled: false },
      misspelling: { enabled: false },
      phraseInsertion: { enabled: false },
      numberSimplification: { enabled: false },
      phraseReplacement: { enabled: false },
      emoji: { enabled: false }
   }
});
assert.equal(disabledDictionary.text, sampleEn);
assert.deepEqual(disabledDictionary.appliedFilters, []);

const low = engine.transform(sampleEn, {
   language: "en",
   intensity: 0.35,
   filterOrder: ["dictionaryReplacement"],
   filters: {
      dictionaryReplacement: { enabled: true },
      misspelling: { enabled: false },
      phraseInsertion: { enabled: false },
      numberSimplification: { enabled: false },
      phraseReplacement: { enabled: false },
      emoji: { enabled: false }
   }
});
const high = engine.transform(sampleEn, {
   language: "en",
   intensity: 0.8,
   filterOrder: ["dictionaryReplacement"],
   filters: {
      dictionaryReplacement: { enabled: true },
      misspelling: { enabled: false },
      phraseInsertion: { enabled: false },
      numberSimplification: { enabled: false },
      phraseReplacement: { enabled: false },
      emoji: { enabled: false }
   }
});

const highKeys = new Set(high.changes?.map((change) => `${change.filterId}:${change.tokenId}:${change.from}->${change.to}`));
for (const change of low.changes ?? []) {
   assert.ok(highKeys.has(`${change.filterId}:${change.tokenId}:${change.from}->${change.to}`));
}
assert.ok((high.changes?.length ?? 0) >= (low.changes?.length ?? 0));

const autoRu = engine.transform(sampleRu, {
   language: "auto",
   intensity: 0.9,
   filters: enabledCore
});
assert.equal(autoRu.language, "ru");
assert.ok(autoRu.text.length > 0);

const manualShort = engine.transform("ok", {
   language: "ru",
   intensity: 1,
   filters: enabledCore
});
assert.equal(manualShort.language, "ru");

const customLanguage = {
   code: "xx",
   aliases: ["xxx"],
   dictionaries: {
      replacements: {
         version: 1,
         language: "xx",
         entries: [
            {
               source: "hello",
               variants: [{ value: "hullo", weight: 1 }],
               probability: 1
            }
         ]
      }
   },
   filters: [dictionaryReplacementFilter],
   rules: {}
};

engine.registerLanguage(customLanguage);
const custom = engine.transform("hello world", {
   language: "xx",
   intensity: 1,
   filters: {
      dictionaryReplacement: { enabled: true }
   }
});
assert.equal(custom.text, "hullo world");

const noNlpEngine = createTextTransformEngine({
   seed: "no-nlp-seed",
   languages: [
      {
         ...englishPack,
         code: "en-lite",
         aliases: ["enl"],
         nlp: undefined
      }
   ],
   defaultLanguage: "en-lite"
});
const noNlpResult = noNlpEngine.transform(sampleEn, {
   language: "en-lite",
   intensity: 99,
   filterOrder: ["phraseInsertion"],
   filters: {
      phraseInsertion: { enabled: true }
   }
});
assert.equal(noNlpResult.language, "en-lite");
assert.ok(noNlpResult.text.length >= sampleEn.length);

const noNlpRussianEngine = createTextTransformEngine({
   seed: "no-ru-nlp-seed",
   languages: [
      {
         ...russianPack,
         code: "ru-lite",
         aliases: ["rul"],
         nlp: undefined
      }
   ],
   defaultLanguage: "ru-lite"
});
const noNlpRussian = noNlpRussianEngine.transform(
   "Красивый человек сейчас говорит и делает простое дело.",
   {
      language: "ru-lite",
      intensity: 99,
      filterOrder: ["phraseInsertion"],
      filters: {
         phraseInsertion: { enabled: true }
      }
   }
);
assert.equal(noNlpRussian.language, "ru-lite");
assert.match(noNlpRussian.text, /прям|вообще|типа|как бы/);

const qualityFilters = {
   phraseReplacement: { enabled: true, intensity: 1.1 },
   dictionaryReplacement: { enabled: true, intensity: 1.15 },
   misspelling: { enabled: true, intensity: 1.15 },
   phraseInsertion: { enabled: true, intensity: 1.1 },
   numberSimplification: { enabled: true, intensity: 1.1 },
   emoji: { enabled: true, intensity: 1 }
};
const qualityEn = engine.transform(
   "This application transforms text into something that sounds more like something a bimbo might write. This is done by inserting some words with little meaning into natural language processing.",
   {
      language: "en",
      intensity: 1,
      filters: qualityFilters
   }
);
assert.ok((qualityEn.changes?.length ?? 0) >= 10);
assert.match(qualityEn.text, /Thiz|dat|sumthin|app|wordz|processin|stuff/);

const qualityRu = engine.transform(
   "Это приложение превращает обычный текст в то, как могла бы писать типичная блондинка. Слова специально искажаются по готовому списку типичных ошибок и простым правилам. Кроме того, числа можно запутывать: 1238 или 15003.",
   {
      language: "ru",
      intensity: 1,
      filters: qualityFilters
   }
);
assert.ok((qualityRu.changes?.length ?? 0) >= 10);
assert.match(qualityRu.text, /аппчик|приложуха|блондиночка|словечки|косяков|циферки|💖|✨|💕/);

const legacyDatMisspellings = engine.transform(
   "The government business calendar described exercise, temperature, architecture, and maintenance.",
   {
      language: "en",
      intensity: 99,
      filterOrder: ["misspelling"],
      filters: {
         misspelling: { enabled: true }
      }
   }
);
assert.match(
   legacyDatMisspellings.text,
   /goberment|buisness|calender|excercise|temperture|aratictature|maintainance/
);

const englishWordNumber = engine.transform("There are sixty-three tests and 15003 events.", {
   language: "en",
   intensity: 99,
   filterOrder: ["numberSimplification"],
   filters: {
      numberSimplification: { enabled: true }
   }
});
assert.doesNotMatch(englishWordNumber.text, /sixty-three/i);
assert.doesNotMatch(englishWordNumber.text, /\d+-three/i);

const russianWordNumber = engine.transform("Тут шестьдесят три теста и 15003 события.", {
   language: "ru",
   intensity: 99,
   filterOrder: ["numberSimplification"],
   filters: {
      numberSimplification: { enabled: true }
   }
});
assert.doesNotMatch(russianWordNumber.text, /шестьдесят три/i);

const quotedFillers = engine.transform('Words like "like", "um", and "basically" should keep quoted words clean.', {
   language: "en",
   intensity: 99,
   filterOrder: ["phraseInsertion"],
   filters: {
      phraseInsertion: { enabled: true }
   }
});
assert.doesNotMatch(quotedFillers.text, /"\s*(like|um|basically)\s+(like|um|basically)"/i);

const webQualityCases = [
   {
      topic: "space",
      language: "en",
      source: "https://science.nasa.gov/solar-system/planets/",
      text: "The solar system has eight planets, and the inner planets have solid surfaces. Scientists compare their size, temperature, atmosphere, and distance from the Sun.\n\nBeyond Mars, the outer planets are giant worlds with swirling gases, moons, rings, and long weather patterns."
   },
   {
      topic: "ocean",
      language: "en",
      source: "https://coast.noaa.gov/states/fast-facts/coral-reefs.html",
      text: "Coral reefs support healthy coasts and local economies. They protect shorelines, provide habitat, and help communities that depend on tourism and fisheries.\n\nWarmer ocean water can stress coral and cause bleaching. A reef may need many years to recover after severe heat."
   },
   {
      topic: "earthquakes",
      language: "en",
      source: "https://www.usgs.gov/natural-hazards/earthquake-hazards/science/earthquake-facts-earthquake-fantasy",
      text: "Earthquakes happen when stress builds along a fault and rocks slip suddenly. The released energy travels through the ground as shaking waves.\n\nBuilding design, local soil, and emergency preparation matter because damage depends on more than magnitude alone."
   },
   {
      topic: "energy",
      language: "en",
      source: "https://www.energy.gov/energysaver/residential-renewable-energy",
      text: "A home renewable energy project works best after basic efficiency improvements. Insulation, air sealing, efficient appliances, and smart water use can reduce waste.\n\nSolar, wind, or geothermal systems may lower utility bills when the house is ready for the equipment."
   },
   {
      topic: "nutrition",
      language: "en",
      source: "https://www.myplate.gov/web/web/",
      text: "MyPlate explains the five food groups and encourages practical daily choices. A healthy meal can fit a family's budget, culture, schedule, and preferences.\n\nSmall goals, like adding vegetables or choosing water, can make better eating feel easier to maintain."
   },
   {
      topic: "consumer",
      language: "en",
      source: "https://consumer.ftc.gov/articles/online-shopping",
      text: "Before buying online, a shopper should compare sellers, read policies, and keep records of receipts and messages. Payment method matters when something goes wrong.\n\nA secure connection helps protect information, but a lock icon does not prove that a seller is honest."
   },
   {
      topic: "business",
      language: "en",
      source: "https://www.sba.gov/business-guide/plan-your-business/write-your-business-plan",
      text: "A business plan helps an owner structure, run, and grow a company. It can guide market research, financial decisions, insurance questions, and daily operations.\n\nInvestors may use the plan to understand whether a project has a realistic path to return."
   },
   {
      topic: "preparedness",
      language: "en",
      source: "https://www.fema.gov/node/gather-supplies-social-media-text",
      text: "An emergency kit should be ready before a storm or evacuation. Families may gather water, food, medications, flashlights, chargers, batteries, and important documents.\n\nPlans should include pets, service animals, and practical supplies that match the needs of the household."
   },
   {
      topic: "park",
      language: "en",
      source: "https://www.nps.gov/GRCA",
      text: "Grand Canyon National Park includes the Colorado River and surrounding uplands in Arizona. The landscape is famous for erosion, exposed rock, and wide views.\n\nVisitors prepare for weather, water availability, trail conditions, lodging, and the long distance between canyon rims."
   },
   {
      topic: "health",
      language: "en",
      source: "https://medlineplus.gov/benefitsofexercise.html",
      text: "Exercise can support physical, emotional, and mental health. Endurance activity increases breathing and heartbeat, which helps the heart and lungs over time.\n\nThe best routine is realistic, regular, and appropriate for a person's age, ability, and medical situation."
   }
];

for (let testCase of webQualityCases) {
   let result = engine.transform(testCase.text, {
      language: testCase.language,
      intensity: 1,
      filters: qualityFilters,
      options: {
         source: testCase.source,
         topic: testCase.topic
      }
   });

   assert.notEqual(result.text, testCase.text, `web fixture ${testCase.topic} should change`);
   assert.ok((result.changes?.length ?? 0) >= 6, `web fixture ${testCase.topic} should have enough changes`);
   assert.ok(result.appliedFilters.includes("misspelling"), `web fixture ${testCase.topic} should use misspelling`);
}

console.log("um-typos smoke tests passed");
