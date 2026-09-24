import type {
  ImgHTMLAttributes,
} from "react"

type UmaAvatarImageProps =
  Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "src"
  > & {
    avatar: string
  }

function resolveAvatarPath(
  avatar: string
) {
  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:")
  ) {
    return avatar
  }

  return `${import.meta.env.BASE_URL}${avatar.replace(
    /^\/+/,
    ""
  )}`
}

function UmaAvatarImage({
  avatar,
  ...imageProps
}: UmaAvatarImageProps) {
  return (
    <img
      {...imageProps}
      src={resolveAvatarPath(avatar)}
    />
  )
}

export default UmaAvatarImage