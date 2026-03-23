export default function ManageHome({ params }: { params: { store: string } }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Manage — Store {params.store}</h1>
      <p className="text-gray-600">Coming soon.</p>
    </div>
  );
}
