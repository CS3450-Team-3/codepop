export default function StoreHome({ params }: { params: { store: string } }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Store {params.store}</h1>
      <p className="text-gray-600">Welcome to the store!</p>
    </div>
  );
}
