import Link from "next/link";

interface ServerInfo {
  ServerID: string;
  ServerURL: string;
  Region: number | null;
  Status: string;
}

async function getServers(): Promise<ServerInfo[]> {
  try {
    // Fetched server-side; /api/servers proxies to backend1 via next.config.ts rewrites.
    const res = await fetch(
      `${process.env.BACKEND1_URL ?? "http://localhost:9001"}/backend/servers/`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const servers = await getServers();

  return (
    <div className="flex flex-col justify-center items-center h-screen text-center gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to CodePop!</h1>
        <p className="text-lg text-gray-600">
          Customize your soda with unique flavors and toppings, or generate a
          drink with AI.
        </p>
      </div>

      {servers.length === 0 ? (
        <p className="text-red-500">No stores available. Please try again later.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
            Select a store
          </p>
          {servers.map((server) => (
            <Link
              key={server.ServerID}
              href={`/${server.ServerID}/customer/`}
              className="block border rounded-lg px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="font-semibold">Store {server.ServerID}</div>
              {server.Region !== null && (
                <div className="text-sm text-gray-500">Region {server.Region}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
