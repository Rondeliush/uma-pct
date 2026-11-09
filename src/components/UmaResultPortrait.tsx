import type { CSSProperties } from "react"
import UmaAvatarImage from "./UmaAvatarImage"

const avatarFadeMask = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 3%, black 8%, black 80%, rgba(0,0,0,0.95) 86%, rgba(0,0,0,0.65) 92%, rgba(0,0,0,0.2) 97%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 3%, black 8%, black 80%, rgba(0,0,0,0.95) 86%, rgba(0,0,0,0.65) 92%, rgba(0,0,0,0.2) 97%, transparent 100%)",
}

const avatarSideFadeMask = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 4%, black 10%, black 90%, rgba(0,0,0,0.45) 96%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 4%, black 10%, black 90%, rgba(0,0,0,0.45) 96%, transparent 100%)",
}

type Props = {
  avatar?: string
  name: string
  viewportClassName: string
  imageClassName?: string
  imageStyle?: CSSProperties
}

/** The CM result portrait: shared asset resolution, crop, masks and fallback. */
export default function UmaResultPortrait({ avatar, name, viewportClassName, imageClassName = "h-[260px]", imageStyle }: Props) {
  if (!avatar) return <div className="absolute bottom-8 text-6xl text-white/15">♞</div>
  return <div className={viewportClassName} style={avatarFadeMask}>
    <div className="absolute inset-0" style={avatarSideFadeMask}>
      <UmaAvatarImage avatar={avatar} alt={name} className={`absolute left-1/2 top-0 max-w-none -translate-x-1/2 object-contain object-top ${imageClassName}`} style={imageStyle} />
    </div>
  </div>
}
