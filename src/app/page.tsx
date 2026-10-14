import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/routes";

/** There is no public landing page: the app starts at the dashboard. */
export default function RootPage() {
  redirect(ROUTES.dashboard);
}
