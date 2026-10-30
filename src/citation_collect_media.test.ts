import { dedupeSources } from "./citation_collect_media.ts";

const result = dedupeSources([
  { title: "Lecture", url: "https://example.edu/media", excerpt: "A" },
  { title: "Same source", url: "https://example.edu/media/", excerpt: "B" },
  { title: "Course note", url: "https://example.edu/notes", excerpt: "C" }
]);
if (result.length !== 2 || result[0].url !== "https://example.edu/media") {
  throw new Error("Citation identity should retain the first source for each URL.");
}
console.log("dedupeSources keeps one citation per URL");
