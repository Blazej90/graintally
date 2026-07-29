import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-4 text-muted-foreground" />
      <Switch
        id="theme-toggle"
        checked={isDark}
        onCheckedChange={(checked) => {
          if (theme === 'system') {
            setTheme(checked ? 'dark' : 'light');
          } else {
            setTheme(checked ? 'dark' : 'light');
          }
        }}
        aria-label="Przełącz tryb ciemny"
      />
      <Moon className="size-4 text-muted-foreground" />
      <Label htmlFor="theme-toggle" className="sr-only">
        Tryb ciemny
      </Label>
    </div>
  );
}
