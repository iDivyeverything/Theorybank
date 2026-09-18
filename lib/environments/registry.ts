export interface StudyEnvironment {
  id: string;
  name: string;
  image: string;
  imageAspect: number;
  animation: "coastal" | "still";
  table: {top:string;timber:string;roughness:number};
  ambientEvent?: { image: string; delaySeconds: number; durationSeconds: number; intervalSeconds: number };
  boardLighting: { sunlight: string; ambient: string; intensity: number };
}

// Environment definitions own scenery and lighting only. No chess state lives here.
export const environments: Record<string, StudyEnvironment> = {
  "tropical-shore": {
    id: "tropical-shore", name: "Tropical shore",
    image: "/environments/tropical-shore.webp", imageAspect: 1672 / 941,
    animation: "coastal",
    table: {top:"#bda17a",timber:"#927249",roughness:.91},
    ambientEvent: { image: "/environments/sailboat.png", delaySeconds: 55, durationSeconds: 65, intervalSeconds: 240 },
    boardLighting: { sunlight: "#fff0d3", ambient: "#d2e8e2", intensity: 3.3 },
  },
};
