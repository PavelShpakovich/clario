import { NextResponse } from 'next/server';

function disabledResponse() {
  return NextResponse.json(
    {
      bookmarked: false,
      disabled: true,
      message: 'Bookmarks are temporarily disabled',
    },
    { status: 410 },
  );
}

export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}
