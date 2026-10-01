import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * App icon — the Muriyar Ta brand mark:
 * terracotta rounded square with a white female face/speech-bubble silhouette.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#B8512E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* White female profile silhouette simplified for 32px */}
        <svg
          width="22"
          height="26"
          viewBox="0 0 22 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 2C14 2 18 3 18.5 7C19 11 17 14.5 15 17C14 18 13.5 19.5 13.5 21C13.5 23.5 15 25.5 16.5 26C12 26 8 23 7 19C5.5 14 7.5 9 9.5 6C10.5 4.5 10.5 3 9.5 1.5C11 0.5 13 1 14 2Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
