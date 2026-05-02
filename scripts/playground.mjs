import cases from "../data/playground-cases.json" with { type: "json" };
import { createTextTransformEngine, englishPack, russianPack } from "../dist/index.js";

const profiles = {
   light: {
      intensity: 0.55,
      filters: {
         phraseReplacement: { enabled: true, intensity: 0.7 },
         dictionaryReplacement: { enabled: true, intensity: 0.7 },
         misspelling: { enabled: true, intensity: 0.45 },
         phraseInsertion: { enabled: true, intensity: 0.45 },
         numberSimplification: { enabled: true, intensity: 0.8 },
         emoji: { enabled: false }
      }
   },
   balanced: {
      intensity: 0.9,
      filters: {
         phraseReplacement: { enabled: true, intensity: 1 },
         dictionaryReplacement: { enabled: true, intensity: 1 },
         misspelling: { enabled: true, intensity: 0.85 },
         phraseInsertion: { enabled: true, intensity: 0.8 },
         numberSimplification: { enabled: true, intensity: 1 },
         emoji: { enabled: false }
      }
   },
   strong: {
      intensity: 1,
      filters: {
         phraseReplacement: { enabled: true, intensity: 1.1 },
         dictionaryReplacement: { enabled: true, intensity: 1.15 },
         misspelling: { enabled: true, intensity: 1.15 },
         phraseInsertion: { enabled: true, intensity: 1.1 },
         numberSimplification: { enabled: true, intensity: 1.1 },
         emoji: { enabled: true, intensity: 1 }
      }
   }
};

let args = parseArgs(process.argv.slice(2));
let selectedProfiles = args.profile === "all" ? Object.keys(profiles) : [args.profile];
let selectedCases = args.case === "all" ? cases : cases.filter((testCase) => testCase.id === args.case);

if (selectedCases.length === 0) {
   fail(`Unknown case "${args.case}". Available: ${cases.map((testCase) => testCase.id).join(", ")}`);
}

for (let profileName of selectedProfiles) {
   let profile = profiles[profileName];
   if (!profile) fail(`Unknown profile "${profileName}". Available: ${Object.keys(profiles).join(", ")}, all`);

   let engine = createTextTransformEngine({
      seed: args.seed,
      languages: [englishPack, russianPack],
      defaultLanguage: "en"
   });

   for (let testCase of selectedCases) {
      let result = engine.transform(testCase.text, {
         language: testCase.language,
         intensity: profile.intensity,
         filters: profile.filters
      });

      console.log(`\n=== ${testCase.id} / ${profileName} / ${args.seed} ===`);
      console.log(result.text);
      console.log(`\nchanges: ${result.changes?.length ?? 0}; filters: ${result.appliedFilters.join(", ") || "none"}`);

      if (args.changes && result.changes) {
         for (let change of result.changes) {
            console.log(`- ${change.filterId}: ${change.from} -> ${change.to}`);
         }
      }
   }
}

function parseArgs(argv) {
   let parsed = {
      case: "all",
      profile: "all",
      seed: "playground-seed",
      changes: false
   };
   let positional = [];

   for (let index = 0; index < argv.length; index += 1) {
      let arg = argv[index];
      if (arg === "--changes") {
         parsed.changes = true;
      } else if (arg === "--case") {
         parsed.case = argv[++index] ?? parsed.case;
      } else if (arg === "--profile") {
         parsed.profile = argv[++index] ?? parsed.profile;
      } else if (arg === "--seed") {
         parsed.seed = argv[++index] ?? parsed.seed;
      } else if (arg === "--help" || arg === "-h") {
         console.log("Usage: npm run playground -- [case] [profile] [seed] [--changes]");
         console.log("       npm run playground -- --case readme-en --profile strong --seed demo --changes");
         process.exit(0);
      } else if (arg.startsWith("--")) {
         fail(`Unknown argument "${arg}". Run with --help.`);
      } else {
         positional.push(arg);
      }
   }

   if (positional[0]) parsed.case = positional[0];
   if (positional[1]) parsed.profile = positional[1];
   if (positional[2]) parsed.seed = positional[2];

   return parsed;
}

function fail(message) {
   console.error(message);
   process.exit(1);
}
