import { requireArtistSession } from "@/lib/artist-session";
import { getQrCards } from "@/services/qr-cards";
import { QrCardEditor } from "@/components/qr-card-editor";
export default async function QrCardPage() {
  const session = await requireArtistSession();
  return <QrCardEditor initial={await getQrCards(session.token)} />;
}
