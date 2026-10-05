import type { Metadata } from "next";
import App from "../App";

// The site as it was before the globe took over the front door (app/route.ts).
// Kept for now, and linked from the new page as "Previous site".
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function PreviousHome() {
  return <App />;
}
