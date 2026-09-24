export type TrackImageEntry = {
  id: string
  name: string
  aliases: string[]
  image: string
}

export const trackImages: TrackImageEntry[] = [
  {
    id: "sapporo",
    name: "Sapporo",
    aliases: ["sapporo racecourse"],
    image: `${import.meta.env.BASE_URL}Tracks/sapporo.png`,
  },
  {
    id: "hakodate",
    name: "Hakodate",
    aliases: ["hakodate racecourse"],
    image: `${import.meta.env.BASE_URL}Tracks/hakodate.png`,
  },
  {
    id: "niigata",
    name: "Niigata",
    aliases: ["niigata racecourse"],
    image: `${import.meta.env.BASE_URL}Tracks/niigata.png`,
  },
  {
    id: "fukushima",
    name: "Fukushima",
    aliases: ["fukushima racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/fukushima.png`,
  },
  {
    id: "nakayama",
    name: "Nakayama",
    aliases: ["nakayama racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/nakayama.png`,
  },
  {
    id: "tokyo",
    name: "Tokyo",
    aliases: ["tokyo racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/tokyo.png`,
  },
  {
    id: "chukyo",
    name: "Chukyo",
    aliases: ["chukyo racecourse", "chuukyo"],
    image: `${import.meta.env.BASE_URL}/Tracks/chukyo.png`,
  },
  {
    id: "kyoto",
    name: "Kyoto",
    aliases: ["kyoto racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/kyoto.png`,
  },
  {
    id: "hanshin",
    name: "Hanshin",
    aliases: ["hanshin racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/hanshin.png`,
  },
  {
    id: "kokura",
    name: "Kokura",
    aliases: ["kokura racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/kokura.png`,
  },
  {
    id: "ooi",
    name: "Ooi",
    aliases: [
      "oi",
      "ohi",
      "ooi racecourse",
      "oi racecourse",
      "ohi racecourse",
    ],
    image: `${import.meta.env.BASE_URL}/Tracks/ooi.png`,
  },
  {
    id: "kawasaki",
    name: "Kawasaki",
    aliases: ["kawasaki racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/kawasaki.png`,
  },
  {
    id: "funabashi",
    name: "Funabashi",
    aliases: ["funabashi racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/funabashi.png`,
  },
  {
    id: "morioka",
    name: "Morioka",
    aliases: ["morioka racecourse"],
    image: `${import.meta.env.BASE_URL}/Tracks/morioka.png`,
  },
  {
    id: "longchamp",
    name: "Longchamp",
    aliases: [
      "longchamp racecourse",
      "parislongchamp",
      "paris longchamp",
      "parislongchamp racecourse",
    ],
    image: `${import.meta.env.BASE_URL}/Tracks/longchamp.png`,
  },
  {
    id: "santa-anita",
    name: "Santa Anita Park",
    aliases: [
      "santa anita",
      "santa anita park",
      "santa anita racecourse",
      "santa anita park racecourse",
    ],
    image: `${import.meta.env.BASE_URL}/Tracks/santa-anita.png`,
  },
  {
    id: "del-mar",
    name: "Del Mar",
    aliases: [
      "del mar",
      "del mar racecourse",
      "del mar racetrack",
    ],
    image: `${import.meta.env.BASE_URL}/Tracks/del-mar.png`,
  },
]

export function normalizeTrackName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
}

export function getTrackImage(trackName: string): string | null {
  const normalized = normalizeTrackName(trackName)

  if (!normalized) {
    return null
  }

  const match = trackImages.find((track) => {
    const possibleNames = [
      track.name,
      track.id,
      ...track.aliases,
    ]

    return possibleNames.some(
      (name) => normalizeTrackName(name) === normalized
    )
  })

  return match?.image ?? null
}

export function getTrackName(trackName: string): string | null {
  const normalized = normalizeTrackName(trackName)

  const match = trackImages.find((track) => {
    const possibleNames = [
      track.name,
      track.id,
      ...track.aliases,
    ]

    return possibleNames.some(
      (name) => normalizeTrackName(name) === normalized
    )
  })

  return match?.name ?? null
}
