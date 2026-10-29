// src/components/home/photos.ts
// Photos de la collection (recadrées, éclaircies, filigrane « Atelier des Arts »)
const modules = import.meta.glob("../../assets/collection/lunette-*.jpg", { eager: true, import: "default" }) as Record<string, string>;

export const photos = Object.keys(modules)
  .sort()
  .map((key, index) => ({
    id: index + 1,
    name: `Pièce N°${String(index + 1).padStart(2, "0")}`,
    alt: `Lunettes sans cercle sur mesure L'Atelier des Arts Paris — Pièce N°${String(index + 1).padStart(2, "0")}`,
    image: modules[key],
  }));
