export function MeshHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <header className={`relative overflow-hidden px-4 sm:px-6 py-3 shrink-0 z-20 ${className || ''}`}>
      <div className="absolute inset-0 bg-theme-mesh-base" />
      <div className="absolute top-[-80%] left-[-10%] w-[40%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-1)' }} />
      <div className="absolute top-[-80%] left-[25%] w-[35%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-2)' }} />
      <div className="absolute top-[-80%] right-[10%] w-[30%] h-[300%] rounded-full blur-[60px]" style={{ background: 'var(--theme-mesh-5)' }} />
      <div className="absolute top-[-80%] right-[-10%] w-[25%] h-[300%] rounded-full blur-[40px]" style={{ background: 'var(--theme-mesh-base)' }} />
      {children}
    </header>
  )
}
