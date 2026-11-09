import HomeIcon from "./HomeIcon"

type Props = { count: number; index: number; onSelect: (index: number) => void; onPrevious: () => void; onNext: () => void; label: string }

export default function HomeCarouselControls({ count, index, onSelect, onPrevious, onNext, label }: Props) {
  if (count <= 1) return null
  return <>
    <button type="button" className="home-carousel-arrow home-carousel-previous" onClick={onPrevious} aria-label={`Previous ${label}`}><HomeIcon name="back" /></button>
    <button type="button" className="home-carousel-arrow home-carousel-next" onClick={onNext} aria-label={`Next ${label}`}><HomeIcon name="back" /></button>
    <div className="home-carousel-dots" aria-label={`${label} pagination`}>
      {Array.from({ length: count }, (_, slide) => <button key={slide} type="button" onClick={() => onSelect(slide)} aria-label={`${label} ${slide + 1} of ${count}`} aria-current={slide === index ? "true" : undefined}><span /></button>)}
    </div>
  </>
}
