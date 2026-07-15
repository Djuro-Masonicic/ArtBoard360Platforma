import { NextResponse } from "next/server";

import { getArtistSessionToken } from "@/lib/artist-session";
import { ApiError, apiFetch } from "@/services/api";
import type { PortfolioProject } from "@/types/api";

export async function POST() {
  const token = await getArtistSessionToken();

  if (!token) {
    return NextResponse.json({ message: "Morate biti ulogovani kao umjetnik." }, { status: 401 });
  }

  try {
    const project = await apiFetch<PortfolioProject>("/portfolio-projects/from-profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message, details: error.details },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Portfolio nije mogao biti kreiran iz profila." },
      { status: 500 },
    );
  }
}
