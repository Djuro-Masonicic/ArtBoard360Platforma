export default function NotFound() {
  return (
    <div className="space-y-3 border border-stone-300 bg-white p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500">404</p>
      <h1 className="text-3xl font-semibold">Content not found</h1>
      <p className="text-sm leading-7 text-stone-700">
        The requested artist or page does not exist in the current dataset.
      </p>
    </div>
  );
}
