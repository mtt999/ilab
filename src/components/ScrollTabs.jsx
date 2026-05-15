import { useRef, useState, useEffect } from 'react'

export default function ScrollTabs({ children, style, bg = 'var(--surface)' }) {
  const ref = useRef()
  const [left, setLeft] = useState(false)
  const [right, setRight] = useState(false)

  function check() {
    const el = ref.current
    if (!el) return
    setLeft(el.scrollLeft > 2)
    setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  useEffect(() => {
    check()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', check); ro.disconnect() }
  }, [children])

  return (
    <div style={{ position: 'relative', ...style }}>
      {left && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 1, width: 40, background: `linear-gradient(to right, ${bg} 40%, transparent)`, zIndex: 2, pointerEvents: 'none' }} />
      )}
      <div ref={ref} style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
      {right && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 1, width: 40, background: `linear-gradient(to left, ${bg} 40%, transparent)`, zIndex: 2, pointerEvents: 'none' }} />
      )}
    </div>
  )
}
