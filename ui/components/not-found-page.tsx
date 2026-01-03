export function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">BIG BRAIN</h1>
        <p className="text-sm text-muted-foreground">
          You have been rickrolled! 🎉
        </p>
      </div>
      <img
        src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTZsbTl1em92MTZyenNlMmtwa2ducW0yNzBmcGZraHlvNGo5NHA3NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ju7l5y9osyymQ/giphy.gif"
        alt="Rickrolled"
        className="max-w-[420px] rounded-lg shadow-lg"
        loading="lazy"
      />
    </main>
  );
}
