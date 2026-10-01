import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * App icon — crops the left portion (icon mark) of the approved logo PNG.
 * The PNG lockup is approximately 4:1 wide; the icon mark occupies the
 * leftmost ~25% of the image. We render the PNG at 128×32, show it
 * left-aligned, and clip to 32×32 to isolate the mark.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={process.env.NEXT_PUBLIC_BASE_URL
            ? `${process.env.NEXT_PUBLIC_BASE_URL}/muriyar-ta-logo.png`
            : "http://localhost:3000/muriyar-ta-logo.png"}
          alt=""
          width={128}
          height={32}
          style={{ objectFit: "cover", objectPosition: "left center" }}
        />
      </div>
    ),
    { ...size },
  );
}
