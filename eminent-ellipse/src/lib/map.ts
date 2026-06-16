import type { CollectionEntry } from "astro:content";
import {
  contextLayerLabels,
  getContextLayer,
  getProfileImage,
  getStatusLabel,
} from "./figures";

type FigureEntry = CollectionEntry<"figures">;

export const buildMapModel = (figures: FigureEntry[]) => {
  const mappedPlaces = figures.flatMap(
    (figure) =>
      figure.data.places
        ?.filter((place) => typeof place.latitude === "number" && typeof place.longitude === "number")
        .map((place) => ({
          id: `${figure.id}-${place.name}`,
          figureId: figure.id,
          figureName: figure.data.name,
          imageSrc: getProfileImage(figure).src,
          imageAlt: getProfileImage(figure).alt,
          lifespan: figure.data.lifespan ?? "",
          era: figure.data.era ?? "",
          label: place.name,
          type: place.type ?? "place",
          pointLabel: place.type ? `${place.type} place` : "Life place",
          dateLabel: [place.startYear, place.endYear]
            .filter((year, index, years) => typeof year === "number" && years.indexOf(year) === index)
            .join("-"),
          sortYear: place.startYear ?? place.endYear ?? figure.data.birthYear ?? 0,
          latitude: place.latitude ?? 0,
          longitude: place.longitude ?? 0,
          note: place.note ?? "",
          status: getStatusLabel(place.status),
          kind: "life",
          layer: "personal",
          layerLabel: contextLayerLabels.personal,
          thread: "",
          importance: "",
        })) ?? [],
  );

  const coordinateByPlace = new Map(
    mappedPlaces.map((item) => [item.label, { latitude: item.latitude, longitude: item.longitude }]),
  );
  const eventPlaces = figures.flatMap(
    (figure) =>
      figure.data.contextEvents
        ?.filter((event) => event.place)
        .map((event) => {
          const coordinates = coordinateByPlace.get(event.place ?? "");
          const layer = getContextLayer(event);

          return {
            id: `${figure.id}-${event.label}`,
            figureId: figure.id,
            figureName: figure.data.name,
            imageSrc: getProfileImage(figure).src,
            imageAlt: getProfileImage(figure).alt,
            lifespan: figure.data.lifespan ?? "",
            era: figure.data.era ?? "",
            label: event.place ?? event.label,
            eventLabel: event.label,
            pointLabel: contextLayerLabels[layer],
            dateLabel: [event.year ?? event.startYear, event.endYear]
              .filter((year, index, years) => typeof year === "number" && years.indexOf(year) === index)
              .join("-"),
            sortYear: event.year ?? event.startYear ?? event.endYear ?? figure.data.birthYear ?? 0,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            note: event.note ?? "",
            status: getStatusLabel(event.status),
            kind: "event",
            layer,
            layerLabel: contextLayerLabels[layer],
            thread: event.thread ?? "",
            importance: event.importance ?? "",
          };
        }) ?? [],
  );
  const eventMarkers = eventPlaces
    .filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number")
    .map((item) => ({
      ...item,
      latitude: item.latitude ?? 0,
      longitude: item.longitude ?? 0,
    }));
  const mapMarkers = [...mappedPlaces, ...eventMarkers].sort((a, b) =>
    a.figureName.localeCompare(b.figureName),
  );
  const missingCoordinateItems = [
    ...figures.flatMap(
      (figure) =>
        figure.data.places
          ?.filter((place) => typeof place.latitude !== "number" || typeof place.longitude !== "number")
          .map((place) => ({
            figureId: figure.id,
            figureName: figure.data.name,
            label: place.name,
            note: place.note ?? "Place metadata is present, but coordinates have not been reviewed yet.",
            status: getStatusLabel(place.status),
          })) ?? [],
    ),
    ...eventPlaces
      .filter((item) => typeof item.latitude !== "number" || typeof item.longitude !== "number")
      .map((event) => ({
        figureId: event.figureId,
        figureName: event.figureName,
        label: event.label,
        note: `${event.eventLabel} has a place note but no reviewed coordinates yet.`,
        status: event.status,
      })),
  ];

  return {
    mapMarkers,
    missingCoordinateItems,
  };
};
