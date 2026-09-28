import {
  useEffect,
  useState,
} from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] =
    useState(() =>
      window.matchMedia(
        "(max-width: 767px)"
      ).matches
    )

  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 767px)"
    )

    const handleChange = () => {
      setIsMobile(media.matches)
    }

    handleChange()

    media.addEventListener(
      "change",
      handleChange
    )

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      )
    }
  }, [])

  return isMobile
}