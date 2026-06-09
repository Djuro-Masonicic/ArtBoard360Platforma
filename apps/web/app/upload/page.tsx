import { UploadForm } from "@/components/upload-form";
import { getArtists } from "@/services/artists";

export default async function UploadPage() {
  const artistsResponse = await getArtists({
    page: 1,
    pageSize: 100,
    includeNsfw: true,
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3 border border-stone-300 bg-white p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Upload interface</p>
        <h1 className="text-3xl font-semibold">Upload artwork</h1>
        <p className="text-sm leading-7 text-stone-700">
          This page demonstrates the production upload pipeline: send the file to the NestJS API,
          let the backend validate and upload it to Cloudflare R2, and then persist metadata in
          PostgreSQL.
        </p>
      </section>

      <UploadForm artists={artistsResponse.items} />
    </div>
  );
}
