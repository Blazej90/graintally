import { Wheat, Menu, Calculator, Tractor } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { path: '/', label: 'Kalkulator', icon: Calculator },
  { path: '/transporty', label: 'Moje transporty', icon: Tractor },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Wheat className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Kłosek</h1>
              <p className="text-xs text-muted-foreground">Kalkulator cen skupu zbóż</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <Button
                    key={link.path}
                    variant={location.pathname === link.path ? 'secondary' : 'ghost'}
                    size="sm"
                    asChild
                  >
                    <Link to={link.path}>
                      <Icon className="size-4" />
                      {link.label}
                    </Link>
                  </Button>
                )
              })}
            </nav>
            <div className="flex items-center">
              <ModeToggle />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex h-full flex-col gap-6 pt-12">
                  <nav className="flex flex-col gap-2">
                    {NAV_LINKS.map((link) => {
                      const Icon = link.icon
                      return (
                        <Button
                          key={link.path}
                          variant={location.pathname === link.path ? 'secondary' : 'ghost'}
                          className={cn('justify-start', location.pathname === link.path && 'font-semibold')}
                          asChild
                        >
                          <Link to={link.path}>
                            <Icon className="size-4" />
                            {link.label}
                          </Link>
                        </Button>
                      )
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
