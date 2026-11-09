type Props = {
  title: string
  accent?: "cm" | "loh"
  mobile?: boolean
  titleId?: string
}

/** The existing CM desktop/mobile headings, shared with other competitive events. */
export default function EventPageHeader({ title, accent = "cm", mobile = false, titleId }: Props) {
  const isLoH = accent === "loh"
  return (
    <section data-event-page-header={accent} className={mobile ? "relative py-2" : "relative px-6 py-4"}>
      {!mobile && <div className={`pointer-events-none absolute left-1/2 top-1/2 h-24 w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${isLoH ? "bg-rose-600/10" : "bg-blue-600/10"}`} />}
      <div className={mobile ? "text-center" : "relative text-center"}>
        <div className={`font-black uppercase ${mobile ? "text-[10px] tracking-[0.28em]" : "text-xs tracking-[0.35em]"} ${isLoH ? "text-rose-400" : "text-blue-400"}`}>
          Competitive Event
        </div>
        <h1 id={titleId} className={`mt-1 font-black tracking-tight ${mobile ? "text-2xl text-white" : `bg-gradient-to-r via-white bg-clip-text text-4xl text-transparent ${isLoH ? "from-rose-200 to-pink-200" : "from-blue-200 to-violet-200"}`}`}>
          {title}
        </h1>
        <div className={`mx-auto bg-gradient-to-r from-transparent to-transparent ${mobile ? "mt-3 h-px w-40" : "mt-4 h-[2px] w-80"} ${isLoH ? "via-rose-400" : "via-sky-400"}`} />
      </div>
    </section>
  )
}
