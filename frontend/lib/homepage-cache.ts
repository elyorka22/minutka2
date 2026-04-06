import { cache } from "react";
import { fetchHomepageStable } from "./api-server";

/** Single fetch per request (metadata + page share the same data). */
export const getCachedHomepage = cache(fetchHomepageStable);
