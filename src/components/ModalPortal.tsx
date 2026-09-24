import { createPortal } from "react-dom"
import type { ReactNode } from "react"

type ModalPortalProps = {
  children: ReactNode
}

function ModalPortal({ children }: ModalPortalProps) {
  return createPortal(children, document.body)
}

export default ModalPortal