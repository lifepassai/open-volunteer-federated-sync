import { Card, Switch } from '@heroui/react'
import { ThemeToggle } from '../components/ThemeToggle'
import { useSettingsStore } from '../stores/settingsStore'

export function SettingsPage() {
  const expertMode = useSettingsStore((s) => s.expertMode)
  const setExpertMode = useSettingsStore((s) => s.setExpertMode)

  return (
    <div className="space-y-6">
      <div className="text-sm text-foreground/60">Your preferences are saved locally in this browser.</div>

      <Card>
        <Card.Content className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex flex-col gap-1">
            <h3>Theme</h3>
            <p className="text-sm text-foreground/70">Switch between light and dark mode.</p>
          </div>
          <ThemeToggle />
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="flex flex-row items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex flex-col gap-1">
            <h3>Expert</h3>
            <p className="text-sm text-foreground/70">Enable advanced features and power-user options.</p>
          </div>
          <Switch
            isSelected={expertMode}
            onChange={setExpertMode}
            aria-label="Expert mode"
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </Card.Content>
      </Card>
    </div>
  )
}

