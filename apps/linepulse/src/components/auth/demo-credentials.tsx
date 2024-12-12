export function DemoCredentials() {
  return (
    <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
      <p className="font-semibold uppercase tracking-wide">Demo credentials</p>
      <dl className="mt-1.5 space-y-1 font-mono">
        <div className="flex justify-between gap-2">
          <dt>player@demo.local</dt>
          <dd>Player123!</dd>
        </div>
      </dl>
      <p className="mt-1.5 font-sans">
        Operator accounts (operator@demo.local / Operator123!) can also sign in here to manage
        events.
      </p>
    </div>
  );
}
