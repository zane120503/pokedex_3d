import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <div className="absolute h-full w-full rounded-full border-2 border-primary bg-primary" />
            <div className="absolute top-0 h-1/2 w-full rounded-t-full bg-primary" />
            <div className="absolute h-full w-full rounded-full border-2 border-foreground" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-background" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">Pokédex Pro</span>
        </Link>
      </div>
    </header>
  );
}
